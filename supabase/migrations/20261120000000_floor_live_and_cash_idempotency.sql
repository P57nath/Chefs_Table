-- =====================================================================
-- Migration 0004: live floor data + idempotent cash payments.
--
-- 1. floor_live(): one round-trip for the waiter's floor. Like
--    floor_snapshot() but with the timestamps the floor needs for timers,
--    item counts, and each live session's bill (to show "Paid").
-- 2. record_cash_payment_once(): wraps record_cash_payment() with a
--    client_request_id so a double tap / retry can never record money twice
--    (CLAUDE.md rule 5). The original function stays untouched.
-- =====================================================================

create or replace function public.floor_live()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_rest uuid := public.my_restaurant_id();
begin
  if v_rest is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'table_id', t.id, 'label', t.label, 'seats', t.seats, 'shape', t.shape,
      'pos_x', t.pos_x, 'pos_y', t.pos_y, 'rotation', t.rotation, 'zone_id', t.zone_id,
      'session', case when s.id is null then null else jsonb_build_object(
          'id', s.id, 'status', s.status, 'guest_count', s.guest_count, 'opened_at', s.opened_at,
          'orders', (select coalesce(jsonb_agg(jsonb_build_object(
                         'id', o.id, 'order_no', o.order_no, 'status', o.status,
                         'placed_at', o.placed_at, 'confirmed_at', o.confirmed_at,
                         'sent_at', o.sent_at, 'ready_at', o.ready_at, 'served_at', o.served_at,
                         'subtotal_minor', o.subtotal_minor,
                         'item_count', (select coalesce(sum(oi.quantity), 0) from public.order_items oi
                                         where oi.order_id = o.id and not oi.is_voided))
                       order by o.placed_at), '[]'::jsonb)
                     from public.orders o where o.session_id = s.id and o.status <> 'cancelled'),
          'open_requests', (select coalesce(jsonb_agg(jsonb_build_object(
                         'id', r.id, 'type', r.type, 'status', r.status, 'note', r.note,
                         'created_at', r.created_at)
                       order by r.created_at), '[]'::jsonb)
                     from public.service_requests r where r.session_id = s.id and r.status <> 'resolved'),
          'bill', public.session_bill(s.id)
        ) end)
      order by t.label)
    from public.dining_tables t
    left join public.table_sessions s on s.table_id = t.id and s.status <> 'closed'
    where t.restaurant_id = v_rest and t.is_active
  ), '[]'::jsonb);
end $$;

revoke execute on function public.floor_live() from public, anon;
grant execute on function public.floor_live() to authenticated;

-- ---------------------------------------------------------------------
-- Idempotent cash payments
-- ---------------------------------------------------------------------
alter table public.payments add column client_request_id uuid;
create unique index payments_session_client_request_idx
  on public.payments (session_id, client_request_id) where client_request_id is not null;

create or replace function public.record_cash_payment_once(
  p_session_id uuid, p_amount_minor integer, p_channel text, p_client_request_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_client_request_id is null then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  -- Serialise concurrent retries of the same request.
  perform pg_advisory_xact_lock(hashtextextended(p_client_request_id::text, 0));

  select id into v_id from public.payments
   where session_id = p_session_id and client_request_id = p_client_request_id;
  if found then
    return v_id;                       -- already recorded: same answer, no second payment
  end if;

  -- All permission, session and amount checks live in the tested function.
  v_id := public.record_cash_payment(p_session_id, p_amount_minor, coalesce(p_channel, 'cash'));
  update public.payments set client_request_id = p_client_request_id where id = v_id;
  return v_id;
end $$;

revoke execute on function public.record_cash_payment_once(uuid, integer, text, uuid) from public, anon;
grant execute on function public.record_cash_payment_once(uuid, integer, text, uuid) to authenticated;

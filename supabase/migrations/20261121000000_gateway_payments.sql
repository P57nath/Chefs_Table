-- =====================================================================
-- Migration 0005: online (SSLCommerz) payments around the tested
-- mark_gateway_payment(), which stays untouched.
--
-- 1. start_gateway_payment(): the guest's own JWT starts a payment. Every
--    money rule (membership, open table, no unconfirmed orders, amount ≤ due)
--    is checked here, in one transaction, and the tran_id is generated here.
-- 2. settle_gateway_payment(): server-only (secret key) wrapper used by the
--    IPN and return routes after the Validation API. Adds the guards that
--    keep money safe when callbacks arrive late, twice, or out of order:
--      * paid / pending_review are never downgraded by a later fail/cancel;
--      * a replayed success never overrides a manager's review decision;
--      * a success that would overpay the bill (two phones paid the full due
--        at once) or that lands after the table was closed is parked as
--        pending_review instead of silently counted.
-- 3. review_gateway_payment(): owner/manager approves or rejects a
--    pending_review payment (risk_level = 1 or the guards above).
-- 4. floor_live(): adds the number of payments waiting for review per table.
-- =====================================================================

alter table public.payments
  add column reviewed_by uuid references auth.users (id),
  add column reviewed_at timestamptz;

-- ---------------------------------------------------------------------
-- Amount still due, without the caller checks of session_bill(). Only for
-- use inside SECURITY DEFINER functions (no client can execute it). Mirrors
-- session_bill() exactly; a pgTAP test asserts both agree.
-- ---------------------------------------------------------------------
create or replace function public.session_due_internal(p_session_id uuid)
returns bigint
language plpgsql stable security definer set search_path = public as $$
declare
  v_rest     public.restaurants%rowtype;
  v_subtotal bigint;
  v_service  bigint;
  v_vat      bigint;
  v_paid     bigint;
begin
  select r.* into v_rest
    from public.restaurants r join public.table_sessions s on s.restaurant_id = r.id
   where s.id = p_session_id;
  select coalesce(sum(oi.line_total_minor), 0) into v_subtotal
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where o.session_id = p_session_id
     and o.status not in ('placed', 'cancelled')
     and not oi.is_voided;
  v_service := round(v_subtotal * v_rest.service_charge_bps / 10000.0);
  v_vat     := round((v_subtotal + v_service) * v_rest.vat_bps / 10000.0);
  select coalesce(sum(amount_minor), 0) into v_paid
    from public.payments where session_id = p_session_id and status = 'paid';
  return greatest(v_subtotal + v_service + v_vat - v_paid, 0);
end $$;

-- ---------------------------------------------------------------------
-- Guest starts an online payment.
-- ---------------------------------------------------------------------
create or replace function public.start_gateway_payment(
  p_session_id uuid, p_amount_minor integer default null, p_channel text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_session public.table_sessions%rowtype;
  v_bill    jsonb;
  v_due     bigint;
  v_amount  integer;
  v_tran    text;
  v_id      uuid;
  v_table   public.dining_tables%rowtype;
  v_rest    public.restaurants%rowtype;
begin
  if not public.is_session_guest(p_session_id) then
    raise exception 'NOT_A_GUEST' using errcode = '42501';
  end if;
  -- Lock the session so two phones starting at once see a consistent bill.
  select * into v_session from public.table_sessions where id = p_session_id for update;
  if v_session.status = 'closed' then
    raise exception 'SESSION_CLOSED' using errcode = 'P0001';
  end if;
  if p_channel is null or p_channel not in ('bkash', 'nagad', 'card', 'bank') then
    raise exception 'INVALID_CHANNEL' using errcode = '22023';
  end if;

  v_bill := public.session_bill(p_session_id);
  if (v_bill->>'unconfirmed_orders')::int > 0 then
    raise exception 'UNCONFIRMED_ORDERS' using errcode = 'P0001';
  end if;
  v_due := (v_bill->>'due_minor')::bigint;
  if v_due <= 0 then
    raise exception 'NOTHING_DUE' using errcode = 'P0001';
  end if;
  v_amount := coalesce(p_amount_minor, v_due::integer);
  if v_amount <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  if v_amount > v_due then
    raise exception 'AMOUNT_EXCEEDS_DUE' using errcode = '22023';
  end if;

  -- Anti-abuse: a table can't open more than 10 checkouts in 10 minutes.
  if (select count(*) from public.payments
       where session_id = p_session_id and method = 'sslcommerz'
         and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'TOO_MANY_PAYMENT_ATTEMPTS' using errcode = 'P0001';
  end if;

  v_tran := 'ES-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));
  insert into public.payments (restaurant_id, session_id, method, channel, amount_minor, status, tran_id)
  values (v_session.restaurant_id, p_session_id, 'sslcommerz', p_channel, v_amount, 'initiated', v_tran)
  returning id into v_id;

  select * into v_table from public.dining_tables where id = v_session.table_id;
  select * into v_rest from public.restaurants where id = v_session.restaurant_id;
  return jsonb_build_object(
    'payment_id',      v_id,
    'tran_id',         v_tran,
    'amount_minor',    v_amount,
    'currency',        v_rest.currency,
    'session_id',      p_session_id,
    'table_label',     v_table.label,
    'qr_token',        v_table.qr_token,
    'restaurant_name', v_rest.name
  );
end $$;

-- ---------------------------------------------------------------------
-- Server-only: apply a validated gateway result.
-- ---------------------------------------------------------------------
create or replace function public.settle_gateway_payment(
  p_tran_id text, p_val_id text, p_amount_minor integer,
  p_status public.payment_status, p_payload jsonb)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_pay     public.payments%rowtype;
  v_session public.table_sessions%rowtype;
  v_status  public.payment_status := p_status;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_val_id  text := nullif(btrim(p_val_id), '');   -- '' = no val_id (failed / cancelled)
begin
  select * into v_pay from public.payments where tran_id = p_tran_id for update;
  if not found or v_pay.method <> 'sslcommerz' then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_status in ('failed', 'cancelled') then
    -- Only an unfinished checkout can fail; never undo money or a review.
    if v_pay.status <> 'initiated' then
      return v_pay;
    end if;
    return public.mark_gateway_payment(p_tran_id, v_val_id, p_amount_minor, p_status, v_payload);
  end if;

  if p_status not in ('paid', 'pending_review') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  -- Already counted, parked for a manager, or decided by one: replays change nothing.
  if v_pay.status in ('paid', 'pending_review', 'refunded') or v_pay.reviewed_at is not null then
    return v_pay;
  end if;
  if p_amount_minor is distinct from v_pay.amount_minor then
    raise exception 'AMOUNT_MISMATCH' using errcode = 'P0001';
  end if;

  if v_status = 'paid' then
    select * into v_session from public.table_sessions where id = v_pay.session_id for update;
    if v_session.status = 'closed' then
      v_status := 'pending_review';
      v_payload := v_payload || '{"review_reason":"SESSION_CLOSED"}';
    elsif v_pay.amount_minor > public.session_due_internal(v_pay.session_id) then
      v_status := 'pending_review';
      v_payload := v_payload || '{"review_reason":"OVERPAYMENT"}';
    end if;
  end if;

  return public.mark_gateway_payment(p_tran_id, v_val_id, p_amount_minor, v_status, v_payload);
end $$;

-- ---------------------------------------------------------------------
-- Owner / manager decides a payment that needs review.
-- ---------------------------------------------------------------------
create or replace function public.review_gateway_payment(p_payment_id uuid, p_approve boolean)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_pay    public.payments%rowtype;
  v_target public.payment_status := case when p_approve then 'paid' else 'failed' end;
begin
  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found or not public.is_staff(v_pay.restaurant_id, array['owner','manager']::public.staff_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_approve is null then
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
  if v_pay.status <> 'pending_review' then
    -- Same decision again (double tap, second manager) is a no-op.
    if v_pay.reviewed_at is not null and v_pay.status = v_target then
      return v_pay;
    end if;
    raise exception 'NOT_PENDING_REVIEW' using errcode = 'P0001';
  end if;
  update public.payments set
    status      = v_target,
    paid_at     = case when p_approve then now() else paid_at end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = v_pay.id
  returning * into v_pay;
  return v_pay;
end $$;

-- ---------------------------------------------------------------------
-- floor_live(): + pending_review payments per live session.
-- ---------------------------------------------------------------------
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
          'pending_review', (select count(*) from public.payments p
                              where p.session_id = s.id and p.status = 'pending_review'),
          'bill', public.session_bill(s.id)
        ) end)
      order by t.label)
    from public.dining_tables t
    left join public.table_sessions s on s.table_id = t.id and s.status <> 'closed'
    where t.restaurant_id = v_rest and t.is_active
  ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------
revoke execute on function public.session_due_internal(uuid) from public, anon, authenticated;

revoke execute on function public.start_gateway_payment(uuid, integer, text) from public, anon;
grant execute on function public.start_gateway_payment(uuid, integer, text) to authenticated;

revoke execute on function public.settle_gateway_payment(text, text, integer, public.payment_status, jsonb)
  from public, anon, authenticated;
grant execute on function public.settle_gateway_payment(text, text, integer, public.payment_status, jsonb)
  to service_role;

revoke execute on function public.review_gateway_payment(uuid, boolean) from public, anon;
grant execute on function public.review_gateway_payment(uuid, boolean) to authenticated;

revoke execute on function public.floor_live() from public, anon;
grant execute on function public.floor_live() to authenticated;

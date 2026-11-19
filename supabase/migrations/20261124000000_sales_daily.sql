-- =====================================================================
-- Migration 0008: daily series for the reports dashboard.
-- One row per calendar day in the restaurant's time zone between p_from
-- and p_to (zero-filled), with revenue (paid payments, by paid_at) and
-- orders (non-cancelled, by placed_at). Owner/manager only, like
-- sales_report(). Capped at 400 days.
-- =====================================================================
create or replace function public.sales_daily(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_rest uuid := public.my_restaurant_id();
  v_tz   text;
begin
  if v_rest is null or not public.is_staff(v_rest, array['owner','manager']::public.staff_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_to <= p_from or p_to - p_from > interval '400 days' then
    raise exception 'INVALID_RANGE' using errcode = '22023';
  end if;
  select timezone into v_tz from public.restaurants where id = v_rest;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'day', to_char(d.day, 'YYYY-MM-DD'),
             'revenue_minor', coalesce(p.revenue, 0),
             'orders', coalesce(o.orders, 0))
           order by d.day)
    from generate_series(
           (p_from at time zone v_tz)::date,
           ((p_to - interval '1 microsecond') at time zone v_tz)::date,
           interval '1 day') as d(day)
    left join (
      select (paid_at at time zone v_tz)::date as day, sum(amount_minor) as revenue
      from public.payments
      where restaurant_id = v_rest and status = 'paid' and paid_at >= p_from and paid_at < p_to
      group by 1) p on p.day = d.day::date
    left join (
      select (placed_at at time zone v_tz)::date as day, count(*) as orders
      from public.orders
      where restaurant_id = v_rest and status <> 'cancelled' and placed_at >= p_from and placed_at < p_to
      group by 1) o on o.day = d.day::date
  ), '[]'::jsonb);
end $$;

revoke execute on function public.sales_daily(timestamptz, timestamptz) from public, anon;
grant execute on function public.sales_daily(timestamptz, timestamptz) to authenticated;

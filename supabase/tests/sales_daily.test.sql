-- sales_daily() (migration 0008).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('d3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'sd-waiter@rls.test', false),
  ('d5555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'sd-manager@rls.test', false);
insert into public.staff_members (user_id, restaurant_id, role, display_name) values
  ('d3333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001', 'waiter', 'SD Waiter'),
  ('d5555555-5555-4555-8555-555555555555', '00000000-0000-4000-8000-000000000001', 'manager', 'SD Manager');

create schema tests;
create function tests.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

select tests.act_as('d3333333-3333-4333-8333-333333333333');
select throws_like($$ select public.sales_daily(now() - interval '1 day', now()) $$, '%FORBIDDEN%',
  'waiter cannot read reports');
reset role;

select tests.act_as('d5555555-5555-4555-8555-555555555555');
-- 3 Dhaka days: 2026-01-01 00:00 +06 .. 2026-01-04 00:00 +06
select is(jsonb_array_length(public.sales_daily('2026-01-01 00:00+06', '2026-01-04 00:00+06')), 3,
  'one row per Dhaka day, zero-filled');
select is(public.sales_daily('2026-01-01 00:00+06', '2026-01-04 00:00+06') -> 0 ->> 'day', '2026-01-01',
  'days are local dates');
select is((public.sales_daily('2026-01-01 00:00+06', '2026-01-04 00:00+06') -> 2 ->> 'revenue_minor')::int, 0,
  'empty days are zero');
select throws_like($$ select public.sales_daily('2024-01-01', '2026-01-01') $$, '%INVALID_RANGE%',
  'ranges over 400 days are refused');
reset role;

select * from finish();
rollback;

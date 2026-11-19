-- floor_live() and record_cash_payment_once() (migration 0004).
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', null, true),
  ('a3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'fl-waiter@rls.test', false);
insert into public.staff_members (user_id, restaurant_id, role, display_name) values
  ('a3333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001', 'waiter', 'FL Waiter');

insert into public.dining_tables (restaurant_id, label, qr_token) values
  ('00000000-0000-4000-8000-000000000001', 'PG6', 'pgtap-t6');

create schema tests;
create function tests.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Guest at T6 orders a Mango Lassi; waiter confirms & sends.
select tests.act_as('a1111111-1111-4111-8111-111111111111');
select set_config('t.s', public.join_table('pgtap-t6') ->> 'session_id', true);
select set_config('t.o', public.place_order(current_setting('t.s')::uuid,
  jsonb_build_array(jsonb_build_object('menu_item_id', (select id from public.menu_items where name = 'Mango Lassi'), 'quantity', 2)),
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc')::text, true);
select throws_like($$ select public.floor_live() $$, '%FORBIDDEN%', 'guests cannot read the floor');
reset role;

select tests.act_as('a3333333-3333-4333-8333-333333333333');
select public.advance_order(current_setting('t.o')::uuid, 'in_kitchen');
select set_config('t.row', (select r::text from jsonb_array_elements(public.floor_live()) r where r ->> 'label' = 'PG6'), true);
select is(current_setting('t.row')::jsonb -> 'session' ->> 'id', current_setting('t.s'), 'floor_live shows the live session');
select is((current_setting('t.row')::jsonb -> 'session' -> 'orders' -> 0 ->> 'item_count')::int, 2, 'item count per order');
select ok(current_setting('t.row')::jsonb -> 'session' -> 'orders' -> 0 ->> 'sent_at' is not null, 'orders carry sent_at for timers');
select ok((current_setting('t.row')::jsonb -> 'session' -> 'bill' ->> 'due_minor')::int > 0, 'bill due is included');

-- Idempotent cash: same request id twice → one payment.
select set_config('t.due', public.session_bill(current_setting('t.s')::uuid) ->> 'due_minor', true);
select set_config('t.p1', public.record_cash_payment_once(current_setting('t.s')::uuid, 1000, 'cash',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd')::text, true);
select is(public.record_cash_payment_once(current_setting('t.s')::uuid, 1000, 'cash',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd')::text, current_setting('t.p1'), 'retry returns the same payment');
select is((select count(*)::int from public.payments where session_id = current_setting('t.s')::uuid), 1,
  'only one payment row was written');
select is((public.session_bill(current_setting('t.s')::uuid) ->> 'due_minor')::int,
  current_setting('t.due')::int - 1000, 'due reduced exactly once');
select throws_like($$ select public.record_cash_payment_once(current_setting('t.s')::uuid, 99999999, 'cash', gen_random_uuid()) $$,
  '%AMOUNT_EXCEEDS_DUE%', 'amount rules still apply');
reset role;

select tests.act_as('a1111111-1111-4111-8111-111111111111');
select throws_like($$ select public.record_cash_payment_once(current_setting('t.s')::uuid, 100, 'cash', gen_random_uuid()) $$,
  '%FORBIDDEN%', 'guests cannot record cash');
reset role;

select * from finish();
rollback;

-- =====================================================================
-- RLS + RPC permission tests per role (pgTAP). Run: pnpm db:test
-- Everything runs in one transaction and is rolled back.
-- Fixture users: guest1 (T4), guest2 (T5), outsider (signed in, never
-- scanned), waiter, kitchen, manager, cashier of the demo restaurant.
-- =====================================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- ---------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------
insert into auth.users (id, aud, role, email, is_anonymous) values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', null, true),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', null, true),
  ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', null, true),
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'waiter@rls.test', false),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'kitchen@rls.test', false),
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'manager@rls.test', false),
  ('77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'cashier@rls.test', false);

insert into public.staff_members (user_id, restaurant_id, role, display_name) values
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001', 'waiter',  'RLS Waiter'),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-4000-8000-000000000001', 'kitchen', 'RLS Kitchen'),
  ('55555555-5555-4555-8555-555555555555', '00000000-0000-4000-8000-000000000001', 'manager', 'RLS Manager'),
  ('77777777-7777-4777-8777-777777777777', '00000000-0000-4000-8000-000000000001', 'cashier', 'RLS Cashier');

create schema tests;

-- Switch to an authenticated user for the rest of the transaction (until `reset role`).
create function tests.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function tests.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

-- One Mango Lassi (no required modifiers in the seed).
create function tests.lassi(p_qty int default 1) returns jsonb language sql stable as $$
  select jsonb_build_array(jsonb_build_object(
    'menu_item_id', (select id from public.menu_items where name = 'Mango Lassi'),
    'quantity', p_qty))
$$;
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------
-- anon (no sign-in)
-- ---------------------------------------------------------------------
select tests.act_as_anon();
select is((select count(*)::int from public.dining_tables), 0, 'anon cannot read tables / QR tokens');
select ok((select count(*) from public.menu_items) > 0, 'anon can read the menu');
select throws_ok($$ select public.join_table('demo-table-04') $$, '42501', null,
  'anon cannot call join_table');
reset role;

-- ---------------------------------------------------------------------
-- guest1 joins T4 and orders
-- ---------------------------------------------------------------------
select tests.act_as('11111111-1111-4111-8111-111111111111');
select set_config('t.s1', public.join_table('demo-table-04') ->> 'session_id', true);
select set_config('t.o1', public.place_order(current_setting('t.s1')::uuid, tests.lassi(2),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')::text, true);

select throws_like($$ select public.join_table('not-a-real-token') $$, '%TABLE_NOT_FOUND%',
  'unknown QR token is rejected');
select is((select count(*)::int from public.orders where session_id = current_setting('t.s1')::uuid), 1,
  'guest sees their table''s order');
select is((select count(*)::int from public.dining_tables), 0, 'guest cannot read tables / QR tokens');
select throws_ok($$
  insert into public.orders (restaurant_id, session_id, table_id, client_request_id)
  select restaurant_id, id, table_id, gen_random_uuid() from public.table_sessions
  where id = current_setting('t.s1')::uuid $$,
  '42501', null, 'guest cannot insert orders directly');
select is_empty($$
  update public.orders set status = 'served' where id = current_setting('t.o1')::uuid returning id $$,
  'guest cannot update order status directly');
select throws_ok($$ select public.mark_gateway_payment('ES-x', null, 1, 'paid', '{}'::jsonb) $$,
  '42501', null, 'guest cannot call mark_gateway_payment');
select throws_like($$ select public.advance_order(current_setting('t.o1')::uuid, 'confirmed') $$,
  '%FORBIDDEN%', 'guest cannot confirm orders');
select is((select count(*)::int from public.order_events), 0, 'guest cannot read the audit log');
select throws_like($$ select public.record_cash_payment(current_setting('t.s1')::uuid, 100) $$,
  '%FORBIDDEN%', 'guest cannot record cash payments');
reset role;

-- ---------------------------------------------------------------------
-- guest2 at T5 cannot touch T4
-- ---------------------------------------------------------------------
select tests.act_as('22222222-2222-4222-8222-222222222222');
select set_config('t.s2', public.join_table('demo-table-05') ->> 'session_id', true);
select set_config('t.o2', public.place_order(current_setting('t.s2')::uuid, tests.lassi(),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')::text, true);

select is((select count(*)::int from public.orders where session_id = current_setting('t.s1')::uuid), 0,
  'guest at another table cannot see T4 orders');
select throws_like($$ select public.place_order(current_setting('t.s1')::uuid, tests.lassi(), gen_random_uuid()) $$,
  '%NOT_A_GUEST%', 'guest cannot order on another table''s session');
reset role;

-- ---------------------------------------------------------------------
-- outsider (signed in, never scanned a QR)
-- ---------------------------------------------------------------------
select tests.act_as('66666666-6666-4666-8666-666666666666');
select is((select count(*)::int from public.orders), 0, 'outsider sees no orders');
select throws_like($$ select public.session_bill(current_setting('t.s1')::uuid) $$, '%NOT_FOUND%',
  'outsider cannot read a bill');
select throws_like($$ select public.floor_snapshot() $$, '%FORBIDDEN%', 'outsider cannot read the floor');
reset role;

-- ---------------------------------------------------------------------
-- kitchen cannot do floor work
-- ---------------------------------------------------------------------
select tests.act_as('44444444-4444-4444-8444-444444444444');
select throws_like($$ select public.advance_order(current_setting('t.o1')::uuid, 'confirmed') $$,
  '%INVALID_TRANSITION%', 'kitchen cannot confirm orders');
select is((select count(*)::int from public.staff_members), 1, 'kitchen sees only its own staff row');
reset role;

-- ---------------------------------------------------------------------
-- waiter: confirm & send, but no kitchen cancel / reports
-- ---------------------------------------------------------------------
select tests.act_as('33333333-3333-4333-8333-333333333333');
select is((public.advance_order(current_setting('t.o1')::uuid, 'in_kitchen')).status::text, 'in_kitchen',
  'waiter can confirm & send to kitchen');
select throws_like($$ select public.advance_order(current_setting('t.o1')::uuid, 'cancelled', 'changed mind') $$,
  '%INVALID_TRANSITION%', 'waiter cannot cancel an order already in the kitchen');
select throws_like($$ select public.sales_report(now() - interval '1 day', now()) $$, '%FORBIDDEN%',
  'waiter cannot read reports');
select ok(jsonb_array_length(public.floor_snapshot()) > 0, 'waiter can read the floor snapshot');
reset role;

-- ---------------------------------------------------------------------
-- kitchen: start + ready, but no payments
-- ---------------------------------------------------------------------
select tests.act_as('44444444-4444-4444-8444-444444444444');
select is((public.advance_order(current_setting('t.o1')::uuid, 'preparing')).status::text, 'preparing',
  'kitchen can start an order');
select is((public.advance_order(current_setting('t.o1')::uuid, 'ready')).status::text, 'ready',
  'kitchen can mark an order ready');
select throws_like($$ select public.record_cash_payment(current_setting('t.s1')::uuid, 100) $$,
  '%FORBIDDEN%', 'kitchen cannot record payments');
reset role;

-- ---------------------------------------------------------------------
-- waiter serves; cannot close or force-close with a balance
-- ---------------------------------------------------------------------
select tests.act_as('33333333-3333-4333-8333-333333333333');
select is((public.advance_order(current_setting('t.o1')::uuid, 'served')).status::text, 'served',
  'waiter can mark served');
select throws_like($$ select public.close_session(current_setting('t.s1')::uuid) $$, '%UNPAID_BALANCE%',
  'table with unpaid balance cannot be closed');
select throws_like($$ select public.close_session(current_setting('t.s1')::uuid, true) $$, '%UNPAID_BALANCE%',
  'waiter cannot force-close an unpaid table');
reset role;

-- ---------------------------------------------------------------------
-- cashier: cash is capped at the amount due
-- ---------------------------------------------------------------------
select tests.act_as('77777777-7777-4777-8777-777777777777');
select throws_like($$ select public.record_cash_payment(current_setting('t.s1')::uuid, 99999999) $$,
  '%AMOUNT_EXCEEDS_DUE%', 'cash payment cannot exceed the amount due');
reset role;

-- ---------------------------------------------------------------------
-- manager: kitchen cancel, reports, team, force-close
-- ---------------------------------------------------------------------
select tests.act_as('55555555-5555-4555-8555-555555555555');
select lives_ok($$ select public.advance_order(current_setting('t.o2')::uuid, 'in_kitchen') $$,
  'manager can send to kitchen');
select is((public.advance_order(current_setting('t.o2')::uuid, 'cancelled', 'Out of stock')).status::text,
  'cancelled', 'manager can cancel an order in the kitchen');
select lives_ok($$ select public.sales_report(now() - interval '1 day', now() + interval '1 hour') $$,
  'manager can read reports');
select ok((select count(*) from public.staff_members) >= 4, 'manager sees the whole team');
select lives_ok($$ select public.close_session(current_setting('t.s1')::uuid, true) $$,
  'manager can force-close an unpaid table');
reset role;

-- ---------------------------------------------------------------------
-- guest after the table was closed
-- ---------------------------------------------------------------------
select tests.act_as('11111111-1111-4111-8111-111111111111');
select throws_like($$ select public.place_order(current_setting('t.s1')::uuid, tests.lassi(), gen_random_uuid()) $$,
  '%SESSION_CLOSED%', 'no new orders on a closed table');
select is((select status::text from public.table_sessions where id = current_setting('t.s1')::uuid), 'closed',
  'guest sees their table as closed');
reset role;

select * from finish();
rollback;

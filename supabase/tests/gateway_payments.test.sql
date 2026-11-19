-- Online payments: start_gateway_payment / settle_gateway_payment /
-- review_gateway_payment (migration 0005).
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('b1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', null, true),
  ('b2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', null, true),
  ('b3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'gp-waiter@rls.test', false),
  ('b5555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'gp-manager@rls.test', false);
insert into public.staff_members (user_id, restaurant_id, role, display_name) values
  ('b3333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001', 'waiter', 'GP Waiter'),
  ('b5555555-5555-4555-8555-555555555555', '00000000-0000-4000-8000-000000000001', 'manager', 'GP Manager');
insert into public.dining_tables (restaurant_id, label, qr_token) values
  ('00000000-0000-4000-8000-000000000001', 'PG7', 'pgtap-t7');

create schema tests;
create function tests.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function tests.as_server() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;
create function tests.lassi(p_qty int) returns jsonb language sql stable as $$
  select jsonb_build_array(jsonb_build_object(
    'menu_item_id', (select id from public.menu_items where name = 'Mango Lassi'), 'quantity', p_qty))
$$;
grant usage on schema tests to authenticated, service_role;
grant execute on all functions in schema tests to authenticated, service_role;

-- Guest orders; while unconfirmed nothing can be paid online.
select tests.act_as('b1111111-1111-4111-8111-111111111111');
select set_config('t.s', public.join_table('pgtap-t7') ->> 'session_id', true);
select set_config('t.o', public.place_order(current_setting('t.s')::uuid, tests.lassi(3),
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')::text, true);
select throws_like($$ select public.start_gateway_payment(current_setting('t.s')::uuid, null, 'bkash') $$,
  '%UNCONFIRMED_ORDERS%', 'cannot pay while an order is unconfirmed');
reset role;

select tests.act_as('b3333333-3333-4333-8333-333333333333');
select public.advance_order(current_setting('t.o')::uuid, 'in_kitchen');
reset role;

-- Bill helper agrees with session_bill.
select is(public.session_due_internal(current_setting('t.s')::uuid),
  (public.session_bill(current_setting('t.s')::uuid) ->> 'due_minor')::bigint,
  'session_due_internal matches session_bill');
select set_config('t.due', public.session_due_internal(current_setting('t.s')::uuid)::text, true);

-- Outsider (second anonymous user who never scanned PG7).
select tests.act_as('b2222222-2222-4222-8222-222222222222');
select throws_like($$ select public.start_gateway_payment(current_setting('t.s')::uuid, null, 'bkash') $$,
  '%NOT_A_GUEST%', 'outsider cannot start a payment');
reset role;

select tests.act_as('b1111111-1111-4111-8111-111111111111');
select throws_like($$ select public.start_gateway_payment(current_setting('t.s')::uuid, null, 'paypal') $$,
  '%INVALID_CHANNEL%', 'unknown channel rejected');
select throws_like($$ select public.start_gateway_payment(current_setting('t.s')::uuid,
  current_setting('t.due')::int + 1, 'bkash') $$, '%AMOUNT_EXCEEDS_DUE%', 'amount above due rejected');
select throws_like($$ select public.start_gateway_payment(current_setting('t.s')::uuid, 0, 'bkash') $$,
  '%INVALID_AMOUNT%', 'zero amount rejected');
-- p1: full due. p2: full due again (second phone). p3: small split.
select set_config('t.p1', public.start_gateway_payment(current_setting('t.s')::uuid, null, 'bkash')::text, true);
select is((current_setting('t.p1')::jsonb ->> 'amount_minor')::bigint, current_setting('t.due')::bigint,
  'amount defaults to the due');
select ok(current_setting('t.p1')::jsonb ->> 'tran_id' ~ '^ES-[0-9A-F]{20}$', 'tran_id generated in Postgres');
select is(current_setting('t.p1')::jsonb ->> 'qr_token', 'pgtap-t7', 'returns the table token for the return URL');
select set_config('t.p2', public.start_gateway_payment(current_setting('t.s')::uuid, null, 'nagad')::text, true);
select set_config('t.p3', public.start_gateway_payment(current_setting('t.s')::uuid, 100, 'card')::text, true);
select throws_ok($$ select public.settle_gateway_payment(current_setting('t.p1')::jsonb ->> 'tran_id', 'v', 1, 'paid', '{}') $$,
  '42501', null, 'guest cannot settle a payment');
select is((select status::text from public.payments where tran_id = current_setting('t.p1')::jsonb ->> 'tran_id'),
  'initiated', 'guest sees their initiated payment');
reset role;

-- Server side.
select tests.as_server();
select throws_like($$ select public.settle_gateway_payment(current_setting('t.p1')::jsonb ->> 'tran_id', 'val-1',
  current_setting('t.due')::int - 1, 'paid', '{}') $$, '%AMOUNT_MISMATCH%', 'tampered amount rejected');
select is((public.settle_gateway_payment(current_setting('t.p1')::jsonb ->> 'tran_id', 'val-1',
  current_setting('t.due')::int, 'paid', '{}')).status::text, 'paid', 'validated payment marked paid');
select is((public.settle_gateway_payment(current_setting('t.p1')::jsonb ->> 'tran_id', 'val-1',
  current_setting('t.due')::int, 'paid', '{}')).status::text, 'paid', 'IPN replay is a no-op');
select is((public.settle_gateway_payment(current_setting('t.p1')::jsonb ->> 'tran_id', null,
  current_setting('t.due')::int, 'cancelled', '{}')).status::text, 'paid', 'late cancel never undoes a payment');
select is((select sum(amount_minor)::bigint from public.payments
  where session_id = current_setting('t.s')::uuid and status = 'paid'), current_setting('t.due')::bigint,
  'counted exactly once');
select is(public.session_due_internal(current_setting('t.s')::uuid), 0::bigint, 'bill is settled');

-- Second phone also paid the full amount → parked, not silently counted.
select is((public.settle_gateway_payment(current_setting('t.p2')::jsonb ->> 'tran_id', 'val-2',
  current_setting('t.due')::int, 'paid', '{}')).status::text, 'pending_review', 'overpayment needs review');
select is((select gateway_payload ->> 'review_reason' from public.payments
  where tran_id = current_setting('t.p2')::jsonb ->> 'tran_id'), 'OVERPAYMENT', 'review reason recorded');
select is((public.settle_gateway_payment(current_setting('t.p2')::jsonb ->> 'tran_id', null,
  current_setting('t.due')::int, 'failed', '{}')).status::text, 'pending_review', 'fail signal cannot hide it');
select is((public.settle_gateway_payment(current_setting('t.p3')::jsonb ->> 'tran_id', null, 100, 'failed', '{}')).status::text,
  'failed', 'unfinished checkout can fail');
reset role;

-- Floor shows the payment waiting for review.
select tests.act_as('b3333333-3333-4333-8333-333333333333');
select is((select (r -> 'session' ->> 'pending_review')::int from jsonb_array_elements(public.floor_live()) r
  where r ->> 'label' = 'PG7'), 1, 'floor_live counts payments to review');
select throws_like($$ select public.review_gateway_payment(
  (select id from public.payments where tran_id = current_setting('t.p2')::jsonb ->> 'tran_id'), false) $$,
  '%FORBIDDEN%', 'waiter cannot review payments');
reset role;

select tests.act_as('b5555555-5555-4555-8555-555555555555');
select is((public.review_gateway_payment(
  (select id from public.payments where tran_id = current_setting('t.p2')::jsonb ->> 'tran_id'), false)).status::text,
  'failed', 'manager rejects (to be refunded)');
select is((public.review_gateway_payment(
  (select id from public.payments where tran_id = current_setting('t.p2')::jsonb ->> 'tran_id'), false)).status::text,
  'failed', 'same decision twice is a no-op');
select throws_like($$ select public.review_gateway_payment(
  (select id from public.payments where tran_id = current_setting('t.p2')::jsonb ->> 'tran_id'), true) $$,
  '%NOT_PENDING_REVIEW%', 'a decided payment cannot be flipped');
reset role;

select tests.as_server();
select is((public.settle_gateway_payment(current_setting('t.p2')::jsonb ->> 'tran_id', 'val-2',
  current_setting('t.due')::int, 'paid', '{}')).status::text, 'failed', 'IPN replay cannot override a review');
reset role;

select * from finish();
rollback;

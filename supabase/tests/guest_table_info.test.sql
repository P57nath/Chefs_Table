-- guest_table_info: public lookup by QR token (migration 0003).
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(public.guest_table_info('demo-table-04') ->> 'table_label', 'T4',
  'anon can resolve a valid QR token to its table label');
select is(public.guest_table_info('demo-table-04') ->> 'restaurant_name', 'Ember & Spice',
  'returns restaurant branding');
select ok(public.guest_table_info('demo-table-04') ? 'qr_token' = false,
  'does not echo any token');
select is(public.guest_table_info('not-a-token'), null, 'unknown token returns null');
reset role;

update public.dining_tables set is_active = false where qr_token = 'demo-table-05';
set local role anon;
select is(public.guest_table_info('demo-table-05'), null, 'inactive table returns null');
select is((select count(*)::int from public.dining_tables), 0, 'anon still cannot list tables');
reset role;

select * from finish();
rollback;

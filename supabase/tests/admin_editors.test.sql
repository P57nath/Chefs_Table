-- Admin editor functions (migration 0007).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('c3333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'ae-waiter@rls.test', false),
  ('c5555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'ae-manager@rls.test', false);
insert into public.staff_members (user_id, restaurant_id, role, display_name) values
  ('c3333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001', 'waiter', 'AE Waiter'),
  ('c5555555-5555-4555-8555-555555555555', '00000000-0000-4000-8000-000000000001', 'manager', 'AE Manager');
insert into public.dining_tables (restaurant_id, label, qr_token, pos_x, pos_y) values
  ('00000000-0000-4000-8000-000000000001', 'PG8', 'pgtap-t8', 1, 1);

create schema tests;
create function tests.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function tests.item(p_id uuid, p_opts jsonb) returns jsonb language sql stable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', p_id,
    'category_id', (select id from public.menu_categories where name = 'Desserts'),
    'name', 'PG Pudding', 'name_bn', null, 'description', 'Test', 'description_bn', null,
    'price_minor', 15000, 'image_path', null, 'tags', jsonb_build_array('veg'),
    'spice_level', 0, 'prep_minutes', 5, 'is_available', true,
    'groups', jsonb_build_array(jsonb_build_object(
      'name', 'Topping', 'min_select', 0, 'max_select', 2, 'options', p_opts))))
$$;
grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

select tests.act_as('c3333333-3333-4333-8333-333333333333');
select throws_like($$ select public.admin_save_menu_item(tests.item(null, '[{"name":"Nuts","price_delta_minor":2000}]')) $$,
  '%FORBIDDEN%', 'waiter cannot edit the menu');
select throws_like($$ select public.admin_rotate_qr((select id from public.dining_tables where label = 'PG8')) $$,
  '%FORBIDDEN%', 'waiter cannot rotate QR codes');
reset role;

select tests.act_as('c5555555-5555-4555-8555-555555555555');
select set_config('t.i', public.admin_save_menu_item(tests.item(null,
  '[{"name":"Nuts","price_delta_minor":2000},{"name":"Syrup","price_delta_minor":1000}]'))::text, true);
select is((select price_minor from public.menu_items where id = current_setting('t.i')::uuid), 15000,
  'manager creates an item');
select is((select count(*)::int from public.modifier_options o join public.modifier_groups g on g.id = o.group_id
  where g.item_id = current_setting('t.i')::uuid), 2, 'with its options');
select is((select tags from public.menu_items where id = current_setting('t.i')::uuid), array['veg'],
  'tags saved');

-- Edit: keep the group (by id) but drop "Syrup" and rename "Nuts".
select set_config('t.g', (select id::text from public.modifier_groups where item_id = current_setting('t.i')::uuid), true);
select set_config('t.o', (select o.id::text from public.modifier_options o where o.group_id = current_setting('t.g')::uuid and o.name = 'Nuts'), true);
select public.admin_save_menu_item(
  jsonb_set(tests.item(current_setting('t.i')::uuid, '[]'), '{groups}', jsonb_build_array(jsonb_build_object(
    'id', current_setting('t.g'), 'name', 'Topping', 'min_select', 0, 'max_select', 1,
    'options', jsonb_build_array(jsonb_build_object('id', current_setting('t.o'), 'name', 'Pistachio', 'price_delta_minor', 2500))))));
select is((select string_agg(name, ',') from public.modifier_options where group_id = current_setting('t.g')::uuid),
  'Pistachio', 'missing options are removed, kept ones updated in place');
select is((select max_select::int from public.modifier_groups where id = current_setting('t.g')::uuid), 1,
  'group updated in place');

select throws_like($$ select public.admin_save_menu_item(jsonb_set(tests.item(null, '[]'), '{category_id}', to_jsonb(gen_random_uuid()))) $$,
  '%NOT_FOUND%', 'unknown category rejected');

select set_config('t.d', public.admin_duplicate_menu_item(current_setting('t.i')::uuid)::text, true);
select is((select name from public.menu_items where id = current_setting('t.d')::uuid), 'PG Pudding (copy)',
  'duplicate copies the item');
select is((select count(*)::int from public.modifier_options o join public.modifier_groups g on g.id = o.group_id
  where g.item_id = current_setting('t.d')::uuid), 1, 'and its options');

select public.admin_reorder('items', array[current_setting('t.d')::uuid, current_setting('t.i')::uuid]);
select ok((select sort from public.menu_items where id = current_setting('t.d')::uuid)
        < (select sort from public.menu_items where id = current_setting('t.i')::uuid), 'reorder sets sort');

select is(public.admin_save_floor_layout(jsonb_build_array(jsonb_build_object(
  'id', (select id from public.dining_tables where label = 'PG8'), 'x', 4.5, 'y', 7, 'rotation', -90))), 1,
  'layout saved');
select is((select rotation from public.dining_tables where label = 'PG8'), 270, 'rotation normalised to 0–359');

select set_config('t.tok', public.admin_rotate_qr((select id from public.dining_tables where label = 'PG8')), true);
select is(public.guest_table_info('pgtap-t8'), null, 'old QR token stops working after rotation');
reset role;

select * from finish();
rollback;

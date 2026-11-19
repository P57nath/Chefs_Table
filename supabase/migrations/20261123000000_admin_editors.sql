-- =====================================================================
-- Migration 0007: admin editors.
-- All functions are SECURITY INVOKER: they run with the caller's rights,
-- so the existing owner/manager write policies (RLS) still decide. They
-- exist to make multi-row edits atomic (an item + its modifier groups and
-- options; a whole floor layout; a sort order) and to keep every row inside
-- the caller's restaurant.
-- =====================================================================

create or replace function public.admin_require_manager()
returns uuid
language plpgsql stable security invoker set search_path = public as $$
declare v_rest uuid := public.my_restaurant_id();
begin
  if v_rest is null or not public.is_staff(v_rest, array['owner','manager']::public.staff_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return v_rest;
end $$;

-- ---------------------------------------------------------------------
-- Menu item + modifier groups + options, in one transaction.
-- p = { id?, category_id, name, name_bn, description, description_bn,
--       price_minor, image_path, tags[], spice_level, prep_minutes,
--       is_available, groups: [{ id?, name, name_bn, min_select, max_select,
--       options: [{ id?, name, name_bn, price_delta_minor, is_default, is_available }] }] }
-- Groups/options missing from p are deleted (order history keeps its own
-- snapshot of names and prices).
-- ---------------------------------------------------------------------
create or replace function public.admin_save_menu_item(p jsonb)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_rest  uuid := public.admin_require_manager();
  v_cat   uuid := (p ->> 'category_id')::uuid;
  v_id    uuid;
  v_gid   uuid;
  v_oid   uuid;
  g       jsonb;
  o       jsonb;
  gi      int := 0;
  oi      int;
  v_keep_groups uuid[] := '{}';
  v_keep_opts   uuid[];
begin
  if not exists (select 1 from public.menu_categories where id = v_cat and restaurant_id = v_rest) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if p ->> 'id' is null then
    insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, description_bn,
        price_minor, image_path, tags, spice_level, prep_minutes, is_available, sort)
    values (v_rest, v_cat, p ->> 'name', p ->> 'name_bn', p ->> 'description', p ->> 'description_bn',
        (p ->> 'price_minor')::int, p ->> 'image_path',
        array(select jsonb_array_elements_text(coalesce(p -> 'tags', '[]'))),
        (p ->> 'spice_level')::smallint, (p ->> 'prep_minutes')::smallint,
        coalesce((p ->> 'is_available')::boolean, true),
        coalesce((select max(sort) + 1 from public.menu_items where category_id = v_cat), 0))
    returning id into v_id;
  else
    update public.menu_items set
      category_id    = v_cat,
      name           = p ->> 'name',
      name_bn        = p ->> 'name_bn',
      description    = p ->> 'description',
      description_bn = p ->> 'description_bn',
      price_minor    = (p ->> 'price_minor')::int,
      image_path     = p ->> 'image_path',
      tags           = array(select jsonb_array_elements_text(coalesce(p -> 'tags', '[]'))),
      spice_level    = (p ->> 'spice_level')::smallint,
      prep_minutes   = (p ->> 'prep_minutes')::smallint,
      is_available   = coalesce((p ->> 'is_available')::boolean, is_available)
    where id = (p ->> 'id')::uuid and restaurant_id = v_rest
    returning id into v_id;
    if v_id is null then
      raise exception 'NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;

  for g in select * from jsonb_array_elements(coalesce(p -> 'groups', '[]')) loop
    gi := gi + 1;
    v_gid := null;
    if g ->> 'id' is not null then
      update public.modifier_groups set
        name = g ->> 'name', name_bn = g ->> 'name_bn',
        min_select = (g ->> 'min_select')::smallint, max_select = (g ->> 'max_select')::smallint,
        sort = gi
      where id = (g ->> 'id')::uuid and item_id = v_id
      returning id into v_gid;
    end if;
    if v_gid is null then
      insert into public.modifier_groups (restaurant_id, item_id, name, name_bn, min_select, max_select, sort)
      values (v_rest, v_id, g ->> 'name', g ->> 'name_bn',
              (g ->> 'min_select')::smallint, (g ->> 'max_select')::smallint, gi)
      returning id into v_gid;
    end if;
    v_keep_groups := v_keep_groups || v_gid;

    v_keep_opts := '{}';
    oi := 0;
    for o in select * from jsonb_array_elements(coalesce(g -> 'options', '[]')) loop
      oi := oi + 1;
      v_oid := null;
      if o ->> 'id' is not null then
        update public.modifier_options set
          name = o ->> 'name', name_bn = o ->> 'name_bn',
          price_delta_minor = (o ->> 'price_delta_minor')::int,
          is_default = coalesce((o ->> 'is_default')::boolean, false),
          is_available = coalesce((o ->> 'is_available')::boolean, true),
          sort = oi
        where id = (o ->> 'id')::uuid and group_id = v_gid
        returning id into v_oid;
      end if;
      if v_oid is null then
        insert into public.modifier_options (restaurant_id, group_id, name, name_bn, price_delta_minor,
                                             is_default, is_available, sort)
        values (v_rest, v_gid, o ->> 'name', o ->> 'name_bn', (o ->> 'price_delta_minor')::int,
                coalesce((o ->> 'is_default')::boolean, false),
                coalesce((o ->> 'is_available')::boolean, true), oi)
        returning id into v_oid;
      end if;
      v_keep_opts := v_keep_opts || v_oid;
    end loop;
    delete from public.modifier_options where group_id = v_gid and not (id = any (v_keep_opts));
  end loop;
  delete from public.modifier_groups where item_id = v_id and not (id = any (v_keep_groups));
  return v_id;
end $$;

-- Copy an item with its groups and options (archived copies stay archived).
create or replace function public.admin_duplicate_menu_item(p_item_id uuid)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_rest uuid := public.admin_require_manager();
  v_new  uuid;
  v_gid  uuid;
  g      public.modifier_groups%rowtype;
begin
  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, description_bn,
      price_minor, image_path, tags, spice_level, prep_minutes, is_available, is_active, sort)
  select restaurant_id, category_id, left(name || ' (copy)', 80), name_bn, description, description_bn,
      price_minor, image_path, tags, spice_level, prep_minutes, is_available, is_active, sort + 1
  from public.menu_items where id = p_item_id and restaurant_id = v_rest
  returning id into v_new;
  if v_new is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  for g in select * from public.modifier_groups where item_id = p_item_id order by sort loop
    insert into public.modifier_groups (restaurant_id, item_id, name, name_bn, min_select, max_select, sort)
    values (v_rest, v_new, g.name, g.name_bn, g.min_select, g.max_select, g.sort)
    returning id into v_gid;
    insert into public.modifier_options (restaurant_id, group_id, name, name_bn, price_delta_minor,
                                         is_default, is_available, sort)
    select v_rest, v_gid, name, name_bn, price_delta_minor, is_default, is_available, sort
    from public.modifier_options where group_id = g.id;
  end loop;
  return v_new;
end $$;

-- Sort order = position in the array (only rows of the caller's restaurant).
create or replace function public.admin_reorder(p_kind text, p_ids uuid[])
returns void
language plpgsql security invoker set search_path = public as $$
declare v_rest uuid := public.admin_require_manager();
begin
  if p_kind = 'categories' then
    update public.menu_categories c set sort = x.ord
      from unnest(p_ids) with ordinality as x(id, ord)
     where c.id = x.id and c.restaurant_id = v_rest;
  elsif p_kind = 'items' then
    update public.menu_items i set sort = x.ord
      from unnest(p_ids) with ordinality as x(id, ord)
     where i.id = x.id and i.restaurant_id = v_rest;
  elsif p_kind = 'zones' then
    update public.zones z set sort = x.ord
      from unnest(p_ids) with ordinality as x(id, ord)
     where z.id = x.id and z.restaurant_id = v_rest;
  else
    raise exception 'INVALID_REQUEST' using errcode = '22023';
  end if;
end $$;

-- Whole floor layout in one go: [{ id, x, y, rotation }].
create or replace function public.admin_save_floor_layout(p jsonb)
returns int
language plpgsql security invoker set search_path = public as $$
declare
  v_rest uuid := public.admin_require_manager();
  v_n    int;
begin
  update public.dining_tables t set
    pos_x    = (e ->> 'x')::numeric,
    pos_y    = (e ->> 'y')::numeric,
    rotation = ((e ->> 'rotation')::int % 360 + 360) % 360
  from jsonb_array_elements(p) e
  where t.id = (e ->> 'id')::uuid and t.restaurant_id = v_rest;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- New QR token (old printed codes stop working immediately).
create or replace function public.admin_rotate_qr(p_table_id uuid)
returns text
language plpgsql security invoker set search_path = public as $$
declare
  v_rest  uuid := public.admin_require_manager();
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  update public.dining_tables set qr_token = v_token
   where id = p_table_id and restaurant_id = v_rest;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  return v_token;
end $$;

revoke execute on function
  public.admin_require_manager(),
  public.admin_save_menu_item(jsonb),
  public.admin_duplicate_menu_item(uuid),
  public.admin_reorder(text, uuid[]),
  public.admin_save_floor_layout(jsonb),
  public.admin_rotate_qr(uuid)
from public, anon;
grant execute on function
  public.admin_require_manager(),
  public.admin_save_menu_item(jsonb),
  public.admin_duplicate_menu_item(uuid),
  public.admin_reorder(text, uuid[]),
  public.admin_save_floor_layout(jsonb),
  public.admin_rotate_qr(uuid)
to authenticated;

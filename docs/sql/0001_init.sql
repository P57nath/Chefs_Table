-- =====================================================================
-- Ember & Spice — QR dine-in ordering system
-- Migration 0001: core schema, security (RLS), state machine, RPCs
--
-- Conventions
--   * Money is stored as integer minor units (poisha): ৳420.00 = 42000.
--   * Percentages are stored in basis points (bps): 7.5% = 750.
--   * All writes that matter (orders, status changes, payments) go
--     through SECURITY DEFINER functions. Clients never UPDATE these
--     tables directly; RLS only grants SELECT.
--   * Customers are Supabase *anonymous* users (auth.uid() exists,
--     is_anonymous = true). Staff are normal email users listed in
--     public.staff_members.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.staff_role      as enum ('owner', 'manager', 'waiter', 'kitchen', 'cashier');
create type public.order_status    as enum ('placed', 'confirmed', 'in_kitchen', 'preparing', 'ready', 'served', 'cancelled');
create type public.session_status  as enum ('open', 'billing', 'closed');
create type public.payment_status  as enum ('initiated', 'pending_review', 'paid', 'failed', 'cancelled', 'refunded');
create type public.payment_method  as enum ('cash', 'sslcommerz');
create type public.request_type    as enum ('call_waiter', 'request_bill', 'water', 'cutlery', 'other');
create type public.request_status  as enum ('open', 'acknowledged', 'resolved');
create type public.table_shape     as enum ('round', 'square', 'rect');

-- ---------------------------------------------------------------------
-- Utility: updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Restaurants (single tenant at launch, multi-tenant ready)
-- ---------------------------------------------------------------------
create table public.restaurants (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 80),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  tagline             text,
  currency            text not null default 'BDT',
  timezone            text not null default 'Asia/Dhaka',
  vat_bps             integer not null default 0   check (vat_bps between 0 and 5000),
  service_charge_bps  integer not null default 0   check (service_charge_bps between 0 and 5000),
  logo_path           text,
  settings            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------
create table public.staff_members (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  role           public.staff_role not null,
  display_name   text not null check (char_length(display_name) between 1 and 60),
  avatar_color   text not null default '#F59E0B',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index staff_members_restaurant_idx on public.staff_members (restaurant_id);
create trigger staff_members_updated_at before update on public.staff_members
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Security helpers (SECURITY DEFINER so they can read staff_members
-- without recursive RLS evaluation)
-- ---------------------------------------------------------------------
create or replace function public.staff_role_of(p_restaurant uuid)
returns public.staff_role
language sql stable security definer set search_path = public as $$
  select role from public.staff_members
  where user_id = auth.uid() and restaurant_id = p_restaurant and is_active
$$;

create or replace function public.is_staff(p_restaurant uuid, p_roles public.staff_role[] default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff_members
    where user_id = auth.uid()
      and restaurant_id = p_restaurant
      and is_active
      and (p_roles is null or role = any (p_roles))
  )
$$;

create or replace function public.my_restaurant_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select restaurant_id from public.staff_members where user_id = auth.uid() and is_active
$$;

-- ---------------------------------------------------------------------
-- Floor: zones + tables
-- ---------------------------------------------------------------------
create table public.zones (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 40),
  sort           integer not null default 0,
  created_at     timestamptz not null default now()
);
create index zones_restaurant_idx on public.zones (restaurant_id);

create table public.dining_tables (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  zone_id        uuid references public.zones (id) on delete set null,
  label          text not null check (char_length(label) between 1 and 12),
  seats          integer not null default 4 check (seats between 1 and 20),
  shape          public.table_shape not null default 'square',
  -- Floor-plan grid coordinates (1 unit ≈ 1 metre). Used by 2D and 3D floor views.
  pos_x          numeric(6,2) not null default 0,
  pos_y          numeric(6,2) not null default 0,
  rotation       integer not null default 0 check (rotation between 0 and 359),
  -- Unguessable token printed in the QR code. Rotate it to invalidate old prints.
  qr_token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, label)
);
create index dining_tables_restaurant_idx on public.dining_tables (restaurant_id);
create trigger dining_tables_updated_at before update on public.dining_tables
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------
create table public.menu_categories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 40),
  name_bn        text,
  icon           text,                       -- lucide icon name, e.g. 'flame'
  sort           integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index menu_categories_restaurant_idx on public.menu_categories (restaurant_id, sort);
create trigger menu_categories_updated_at before update on public.menu_categories
  for each row execute function public.tg_set_updated_at();

create table public.menu_items (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants (id) on delete cascade,
  category_id     uuid not null references public.menu_categories (id),
  name            text not null check (char_length(name) between 1 and 80),
  name_bn         text,
  description     text check (description is null or char_length(description) <= 400),
  description_bn  text,
  price_minor     integer not null check (price_minor >= 0),
  image_path      text,                      -- path inside the 'menu-images' storage bucket
  tags            text[] not null default '{}',   -- e.g. {veg, chef_special, new, bestseller}
  spice_level     smallint not null default 0 check (spice_level between 0 and 3),
  prep_minutes    smallint not null default 15 check (prep_minutes between 1 and 180),
  is_available    boolean not null default true,  -- quick "86" toggle (sold out today)
  is_active       boolean not null default true,  -- soft delete
  sort            integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category_id, sort);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id);
create trigger menu_items_updated_at before update on public.menu_items
  for each row execute function public.tg_set_updated_at();

create table public.modifier_groups (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  item_id        uuid not null references public.menu_items (id) on delete cascade,
  name           text not null,
  name_bn        text,
  min_select     smallint not null default 0 check (min_select >= 0),
  max_select     smallint not null default 1 check (max_select >= 1),
  sort           integer not null default 0,
  check (min_select <= max_select)
);
create index modifier_groups_item_idx on public.modifier_groups (item_id);

create table public.modifier_options (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references public.restaurants (id) on delete cascade,
  group_id           uuid not null references public.modifier_groups (id) on delete cascade,
  name               text not null,
  name_bn            text,
  price_delta_minor  integer not null default 0 check (price_delta_minor >= 0),
  is_default         boolean not null default false,
  is_available       boolean not null default true,
  sort               integer not null default 0
);
create index modifier_options_group_idx on public.modifier_options (group_id);

-- ---------------------------------------------------------------------
-- Table sessions (one "sitting" at a table, may contain many orders)
-- ---------------------------------------------------------------------
create table public.table_sessions (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  table_id       uuid not null references public.dining_tables (id),
  status         public.session_status not null default 'open',
  guest_count    smallint not null default 1 check (guest_count between 1 and 30),
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz,
  closed_by      uuid references auth.users (id),
  updated_at     timestamptz not null default now()
);
-- Exactly one live session per table.
create unique index table_sessions_one_live_per_table
  on public.table_sessions (table_id) where status <> 'closed';
create index table_sessions_restaurant_status_idx on public.table_sessions (restaurant_id, status);
create trigger table_sessions_updated_at before update on public.table_sessions
  for each row execute function public.tg_set_updated_at();

create table public.session_guests (
  session_id  uuid not null references public.table_sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index session_guests_user_idx on public.session_guests (user_id);

create or replace function public.is_session_guest(p_session uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.session_guests where session_id = p_session and user_id = auth.uid())
$$;

-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_no           bigint generated always as identity,
  restaurant_id      uuid not null references public.restaurants (id) on delete cascade,
  session_id         uuid not null references public.table_sessions (id) on delete cascade,
  table_id           uuid not null references public.dining_tables (id),
  status             public.order_status not null default 'placed',
  customer_note      text check (customer_note is null or char_length(customer_note) <= 300),
  client_request_id  uuid not null,          -- idempotency key from the customer's device
  placed_by          uuid references auth.users (id),
  subtotal_minor     integer not null default 0 check (subtotal_minor >= 0),
  placed_at          timestamptz not null default now(),
  confirmed_at       timestamptz,
  confirmed_by       uuid references auth.users (id),
  sent_at            timestamptz,
  preparing_at       timestamptz,
  ready_at           timestamptz,
  served_at          timestamptz,
  cancelled_at       timestamptz,
  cancelled_by       uuid references auth.users (id),
  cancel_reason      text,
  updated_at         timestamptz not null default now(),
  unique (session_id, client_request_id)
);
create index orders_restaurant_status_idx on public.orders (restaurant_id, status, placed_at desc);
create index orders_session_idx on public.orders (session_id);
create index orders_placed_at_idx on public.orders (restaurant_id, placed_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.tg_set_updated_at();

create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  restaurant_id     uuid not null references public.restaurants (id) on delete cascade,
  menu_item_id      uuid references public.menu_items (id) on delete set null,
  name_snapshot     text not null,           -- frozen at order time
  unit_price_minor  integer not null check (unit_price_minor >= 0),  -- base + modifiers
  quantity          integer not null check (quantity between 1 and 20),
  modifiers         jsonb not null default '[]'::jsonb,  -- [{group, name, price_delta_minor}]
  line_total_minor  integer not null check (line_total_minor >= 0),
  note              text check (note is null or char_length(note) <= 200),
  is_voided         boolean not null default false,
  is_done           boolean not null default false,  -- kitchen ticks items off
  created_at        timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_menu_item_idx on public.order_items (menu_item_id);

create table public.order_events (
  id             bigint generated always as identity primary key,
  order_id       uuid not null references public.orders (id) on delete cascade,
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  from_status    public.order_status,
  to_status      public.order_status not null,
  actor          uuid,
  note           text,
  created_at     timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create or replace function public.tg_log_order_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, restaurant_id, from_status, to_status, actor)
    values (new.id, new.restaurant_id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_events (order_id, restaurant_id, from_status, to_status, actor, note)
    values (new.id, new.restaurant_id, old.status, new.status, auth.uid(), new.cancel_reason);
  end if;
  return new;
end $$;
create trigger orders_log_event after insert or update of status on public.orders
  for each row execute function public.tg_log_order_event();

-- ---------------------------------------------------------------------
-- Service requests (call waiter, request bill, …)
-- ---------------------------------------------------------------------
create table public.service_requests (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants (id) on delete cascade,
  session_id       uuid not null references public.table_sessions (id) on delete cascade,
  table_id         uuid not null references public.dining_tables (id),
  type             public.request_type not null,
  status           public.request_status not null default 'open',
  note             text check (note is null or char_length(note) <= 200),
  created_by       uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  acknowledged_by  uuid references auth.users (id),
  acknowledged_at  timestamptz,
  resolved_at      timestamptz
);
create index service_requests_open_idx on public.service_requests (restaurant_id, status, created_at desc);
create index service_requests_session_idx on public.service_requests (session_id);

-- ---------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------
create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants (id) on delete cascade,
  session_id       uuid not null references public.table_sessions (id),
  method           public.payment_method not null,
  channel          text,                     -- bkash | nagad | card | bank | rocket | cash ...
  amount_minor     integer not null check (amount_minor > 0),
  status           public.payment_status not null default 'initiated',
  tran_id          text unique,              -- our id sent to the gateway
  gateway_val_id   text,
  gateway_payload  jsonb,
  received_by      uuid references auth.users (id),
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  updated_at       timestamptz not null default now()
);
create index payments_session_idx on public.payments (session_id);
create index payments_restaurant_idx on public.payments (restaurant_id, created_at desc);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Feedback
-- ---------------------------------------------------------------------
create table public.feedback (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  session_id     uuid not null references public.table_sessions (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,
  rating         smallint not null check (rating between 1 and 5),
  comment        text check (comment is null or char_length(comment) <= 500),
  created_at     timestamptz not null default now(),
  unique (session_id, user_id)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.restaurants      enable row level security;
alter table public.staff_members    enable row level security;
alter table public.zones            enable row level security;
alter table public.dining_tables    enable row level security;
alter table public.menu_categories  enable row level security;
alter table public.menu_items       enable row level security;
alter table public.modifier_groups  enable row level security;
alter table public.modifier_options enable row level security;
alter table public.table_sessions   enable row level security;
alter table public.session_guests   enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.order_events     enable row level security;
alter table public.service_requests enable row level security;
alter table public.payments         enable row level security;
alter table public.feedback         enable row level security;

-- Restaurants: public branding is readable by everyone; owners/managers edit.
create policy restaurants_read on public.restaurants for select to anon, authenticated using (true);
create policy restaurants_update on public.restaurants for update to authenticated
  using (public.is_staff(id, array['owner','manager']::public.staff_role[]))
  with check (public.is_staff(id, array['owner','manager']::public.staff_role[]));

-- Staff: see yourself; owners/managers see the whole team. Writes happen
-- server-side with the secret key (role/permission checks in app code).
create policy staff_read on public.staff_members for select to authenticated
  using (user_id = auth.uid() or public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]));

-- Menu: everyone can read active rows; owners/managers write.
create policy menu_categories_read on public.menu_categories for select to anon, authenticated
  using (is_active or public.is_staff(restaurant_id));
create policy menu_categories_write on public.menu_categories for all to authenticated
  using (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]))
  with check (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]));

create policy menu_items_read on public.menu_items for select to anon, authenticated
  using (is_active or public.is_staff(restaurant_id));
create policy menu_items_write on public.menu_items for all to authenticated
  using (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]))
  with check (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]));
-- Kitchen and waiters may toggle availability via set_item_availability().

create policy modifier_groups_read on public.modifier_groups for select to anon, authenticated using (true);
create policy modifier_groups_write on public.modifier_groups for all to authenticated
  using (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]))
  with check (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]));

create policy modifier_options_read on public.modifier_options for select to anon, authenticated using (true);
create policy modifier_options_write on public.modifier_options for all to authenticated
  using (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]))
  with check (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]));

-- Zones & tables: staff only (qr_token is a secret). Customers learn their
-- table label from join_table().
create policy zones_read on public.zones for select to authenticated using (public.is_staff(restaurant_id));
create policy zones_write on public.zones for all to authenticated
  using (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]))
  with check (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]));

create policy tables_read on public.dining_tables for select to authenticated using (public.is_staff(restaurant_id));
create policy tables_write on public.dining_tables for all to authenticated
  using (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]))
  with check (public.is_staff(restaurant_id, array['owner','manager']::public.staff_role[]));

-- Sessions / orders / requests / payments: staff of the restaurant OR a
-- guest who joined that session. All writes go through RPCs below.
create policy sessions_read on public.table_sessions for select to authenticated
  using (public.is_staff(restaurant_id) or public.is_session_guest(id));

create policy session_guests_read on public.session_guests for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.table_sessions s
                    where s.id = session_id and public.is_staff(s.restaurant_id)));

create policy orders_read on public.orders for select to authenticated
  using (public.is_staff(restaurant_id) or public.is_session_guest(session_id));

create policy order_items_read on public.order_items for select to authenticated
  using (public.is_staff(restaurant_id)
         or exists (select 1 from public.orders o
                    where o.id = order_id and public.is_session_guest(o.session_id)));

create policy order_events_read on public.order_events for select to authenticated
  using (public.is_staff(restaurant_id));

create policy service_requests_read on public.service_requests for select to authenticated
  using (public.is_staff(restaurant_id) or public.is_session_guest(session_id));

create policy payments_read on public.payments for select to authenticated
  using (public.is_staff(restaurant_id) or public.is_session_guest(session_id));

create policy feedback_read on public.feedback for select to authenticated
  using (public.is_staff(restaurant_id) or user_id = auth.uid());

-- =====================================================================
-- RPCs — the only way to mutate operational data
-- =====================================================================

-- ---------------------------------------------------------------------
-- join_table: customer scanned a QR code.
-- Opens (or reuses) the live session for that table and registers the
-- caller as a guest. Returns what the customer UI needs.
-- ---------------------------------------------------------------------
create or replace function public.join_table(p_qr_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_table   public.dining_tables%rowtype;
  v_rest    public.restaurants%rowtype;
  v_session public.table_sessions%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_table from public.dining_tables
  where qr_token = p_qr_token and is_active;
  if not found then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_rest from public.restaurants where id = v_table.restaurant_id;

  -- Create the live session if none exists (race-safe via partial unique index).
  insert into public.table_sessions (restaurant_id, table_id)
  values (v_table.restaurant_id, v_table.id)
  on conflict (table_id) where status <> 'closed' do nothing;

  select * into v_session from public.table_sessions
  where table_id = v_table.id and status <> 'closed';

  insert into public.session_guests (session_id, user_id)
  values (v_session.id, v_uid)
  on conflict do nothing;

  -- Keep guest_count at least the number of phones that joined.
  update public.table_sessions
     set guest_count = greatest(guest_count,
           (select count(*) from public.session_guests where session_id = v_session.id)::smallint)
   where id = v_session.id;

  return jsonb_build_object(
    'session_id',        v_session.id,
    'session_status',    v_session.status,
    'table_id',          v_table.id,
    'table_label',       v_table.label,
    'restaurant_id',     v_rest.id,
    'restaurant_name',   v_rest.name,
    'restaurant_slug',   v_rest.slug,
    'currency',          v_rest.currency,
    'vat_bps',           v_rest.vat_bps,
    'service_charge_bps', v_rest.service_charge_bps
  );
end $$;

-- ---------------------------------------------------------------------
-- place_order: customer submits their cart.
-- p_items: [{ "menu_item_id": uuid, "quantity": int,
--             "modifier_option_ids": [uuid], "note": text }]
-- Prices are ALWAYS computed here from the database, never trusted from
-- the client. Idempotent on (session_id, client_request_id).
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_session_id        uuid,
  p_items             jsonb,
  p_client_request_id uuid,
  p_note              text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_session    public.table_sessions%rowtype;
  v_order_id   uuid;
  v_line       jsonb;
  v_item       public.menu_items%rowtype;
  v_qty        integer;
  v_opt_ids    uuid[];
  v_mods       jsonb;
  v_delta      integer;
  v_unit       integer;
  v_subtotal   integer := 0;
  v_pending    integer;
  v_group      record;
  v_cnt        integer;
  v_bad        integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if not public.is_session_guest(p_session_id) then
    raise exception 'NOT_A_GUEST' using errcode = '42501';
  end if;

  -- Idempotency: same device retry returns the same order.
  select id into v_order_id from public.orders
  where session_id = p_session_id and client_request_id = p_client_request_id;
  if found then
    return v_order_id;
  end if;

  select * into v_session from public.table_sessions where id = p_session_id for update;
  if v_session.status = 'closed' then
    raise exception 'SESSION_CLOSED' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  -- Anti-spam: cap unconfirmed orders per session.
  select count(*) into v_pending from public.orders
  where session_id = p_session_id and status = 'placed';
  if v_pending >= 5 then
    raise exception 'TOO_MANY_PENDING_ORDERS' using errcode = 'P0001';
  end if;

  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'NOTE_TOO_LONG' using errcode = '22023';
  end if;

  insert into public.orders (restaurant_id, session_id, table_id, customer_note,
                             client_request_id, placed_by)
  values (v_session.restaurant_id, v_session.id, v_session.table_id,
          nullif(btrim(p_note), ''), p_client_request_id, v_uid)
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(p_items) loop
    -- Item
    select * into v_item from public.menu_items
    where id = (v_line->>'menu_item_id')::uuid
      and restaurant_id = v_session.restaurant_id;
    if not found or not v_item.is_active then
      raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002';
    end if;
    if not v_item.is_available then
      raise exception 'ITEM_UNAVAILABLE:%', v_item.name using errcode = 'P0001';
    end if;

    v_qty := coalesce((v_line->>'quantity')::integer, 0);
    if v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;

    -- Modifiers
    select coalesce(array_agg(distinct x::uuid), '{}')
      into v_opt_ids
      from jsonb_array_elements_text(coalesce(v_line->'modifier_option_ids', '[]'::jsonb)) as x;

    -- Every chosen option must belong to this item and be available.
    select count(*) into v_bad
      from unnest(v_opt_ids) as opt_id
      where not exists (
        select 1 from public.modifier_options o
        join public.modifier_groups g on g.id = o.group_id
        where o.id = opt_id and g.item_id = v_item.id and o.is_available);
    if v_bad > 0 then
      raise exception 'INVALID_MODIFIER' using errcode = '22023';
    end if;

    -- Each group's min/max must be respected.
    for v_group in select * from public.modifier_groups where item_id = v_item.id loop
      select count(*) into v_cnt from public.modifier_options
      where group_id = v_group.id and id = any (v_opt_ids);
      if v_cnt < v_group.min_select or v_cnt > v_group.max_select then
        raise exception 'MODIFIER_RULES:%', v_group.name using errcode = '22023';
      end if;
    end loop;

    select coalesce(sum(o.price_delta_minor), 0)::integer,
           coalesce(jsonb_agg(jsonb_build_object(
               'group', g.name, 'name', o.name, 'name_bn', o.name_bn,
               'price_delta_minor', o.price_delta_minor)
             order by g.sort, o.sort), '[]'::jsonb)
      into v_delta, v_mods
      from public.modifier_options o
      join public.modifier_groups g on g.id = o.group_id
     where o.id = any (v_opt_ids);

    v_unit := v_item.price_minor + v_delta;

    if v_line->>'note' is not null and char_length(v_line->>'note') > 200 then
      raise exception 'NOTE_TOO_LONG' using errcode = '22023';
    end if;

    insert into public.order_items (order_id, restaurant_id, menu_item_id, name_snapshot,
                                    unit_price_minor, quantity, modifiers, line_total_minor, note)
    values (v_order_id, v_session.restaurant_id, v_item.id, v_item.name,
            v_unit, v_qty, v_mods, v_unit * v_qty, nullif(btrim(v_line->>'note'), ''));

    v_subtotal := v_subtotal + v_unit * v_qty;
  end loop;

  update public.orders set subtotal_minor = v_subtotal where id = v_order_id;

  -- A new order re-opens a table that had asked for the bill.
  if v_session.status = 'billing' then
    update public.table_sessions set status = 'open' where id = v_session.id;
  end if;

  return v_order_id;
end $$;

-- ---------------------------------------------------------------------
-- cancel_my_order: customer may cancel only while still 'placed'.
-- ---------------------------------------------------------------------
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not public.is_session_guest(v_order.session_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.status <> 'placed' then
    raise exception 'ALREADY_CONFIRMED' using errcode = 'P0001';
  end if;
  update public.orders
     set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
         cancel_reason = 'Cancelled by guest'
   where id = p_order_id;
end $$;

-- ---------------------------------------------------------------------
-- advance_order: the order state machine (staff only).
--
--   placed ──confirm──▶ confirmed ──send──▶ in_kitchen ──▶ preparing ──▶ ready ──▶ served
--     │  └──────── confirm & send (one tap) ───────▶│                     ▲
--     │                                             └──────(skip)─────────┘
--     └─▶ cancelled  (also from confirmed; from in_kitchen/preparing only by manager/owner)
-- ---------------------------------------------------------------------
create or replace function public.advance_order(
  p_order_id uuid,
  p_to       public.order_status,
  p_reason   text default null
)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_role  public.staff_role;
  v_ok    boolean := false;
  v_floor constant public.staff_role[] := array['owner','manager','waiter','cashier']::public.staff_role[];
  v_kitch constant public.staff_role[] := array['owner','manager','kitchen']::public.staff_role[];
  v_mgmt  constant public.staff_role[] := array['owner','manager']::public.staff_role[];
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  v_role := public.staff_role_of(v_order.restaurant_id);
  if v_role is null then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_ok := case
    when v_order.status = 'placed'     and p_to = 'confirmed'  then v_role = any (v_floor)
    when v_order.status = 'placed'     and p_to = 'in_kitchen' then v_role = any (v_floor)
    when v_order.status = 'confirmed'  and p_to = 'in_kitchen' then v_role = any (v_floor)
    when v_order.status = 'in_kitchen' and p_to = 'preparing'  then v_role = any (v_kitch)
    when v_order.status = 'in_kitchen' and p_to = 'ready'      then v_role = any (v_kitch)
    when v_order.status = 'preparing'  and p_to = 'ready'      then v_role = any (v_kitch)
    when v_order.status = 'ready'      and p_to = 'served'     then v_role = any (v_floor)
    when v_order.status in ('placed','confirmed') and p_to = 'cancelled' then v_role = any (v_floor)
    when v_order.status in ('in_kitchen','preparing','ready') and p_to = 'cancelled' then v_role = any (v_mgmt)
    else false
  end;

  if not v_ok then
    raise exception 'INVALID_TRANSITION:%->%', v_order.status, p_to using errcode = 'P0001';
  end if;

  if p_to = 'cancelled' and coalesce(btrim(p_reason), '') = '' then
    raise exception 'REASON_REQUIRED' using errcode = '22023';
  end if;

  update public.orders set
    status        = p_to,
    confirmed_at  = case when p_to in ('confirmed','in_kitchen') and confirmed_at is null then now() else confirmed_at end,
    confirmed_by  = case when p_to in ('confirmed','in_kitchen') and confirmed_by is null then auth.uid() else confirmed_by end,
    sent_at       = case when p_to = 'in_kitchen' then now() else sent_at end,
    preparing_at  = case when p_to = 'preparing' then now() else preparing_at end,
    ready_at      = case when p_to = 'ready' then now() else ready_at end,
    served_at     = case when p_to = 'served' then now() else served_at end,
    cancelled_at  = case when p_to = 'cancelled' then now() else cancelled_at end,
    cancelled_by  = case when p_to = 'cancelled' then auth.uid() else cancelled_by end,
    cancel_reason = case when p_to = 'cancelled' then btrim(p_reason) else cancel_reason end
  where id = p_order_id
  returning * into v_order;

  if p_to = 'ready' then
    update public.order_items set is_done = true where order_id = p_order_id and not is_voided;
  end if;

  return v_order;
end $$;

-- ---------------------------------------------------------------------
-- waiter_adjust_items: before confirming, a waiter may change quantities
-- or void lines (e.g. item just ran out). p_changes: [{order_item_id, quantity}]
-- quantity = 0 voids the line.
-- ---------------------------------------------------------------------
create or replace function public.waiter_adjust_items(p_order_id uuid, p_changes jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order  public.orders%rowtype;
  v_change jsonb;
  v_qty    integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if not public.is_staff(v_order.restaurant_id, array['owner','manager','waiter','cashier']::public.staff_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_order.status not in ('placed','confirmed') then
    raise exception 'ORDER_LOCKED' using errcode = 'P0001';
  end if;

  for v_change in select * from jsonb_array_elements(p_changes) loop
    v_qty := (v_change->>'quantity')::integer;
    if v_qty is null or v_qty < 0 or v_qty > 20 then
      raise exception 'INVALID_QUANTITY' using errcode = '22023';
    end if;
    if v_qty = 0 then
      update public.order_items set is_voided = true
       where id = (v_change->>'order_item_id')::uuid and order_id = p_order_id;
    else
      update public.order_items
         set quantity = v_qty, line_total_minor = unit_price_minor * v_qty, is_voided = false
       where id = (v_change->>'order_item_id')::uuid and order_id = p_order_id;
    end if;
  end loop;

  update public.orders
     set subtotal_minor = coalesce((select sum(line_total_minor) from public.order_items
                                    where order_id = p_order_id and not is_voided), 0)
   where id = p_order_id;

  if not exists (select 1 from public.order_items where order_id = p_order_id and not is_voided) then
    perform public.advance_order(p_order_id, 'cancelled', 'All items removed by staff');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Kitchen helpers
-- ---------------------------------------------------------------------
create or replace function public.set_order_item_done(p_order_item_id uuid, p_done boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_rest uuid;
begin
  select restaurant_id into v_rest from public.order_items where id = p_order_item_id;
  if v_rest is null or not public.is_staff(v_rest, array['owner','manager','kitchen']::public.staff_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.order_items set is_done = p_done where id = p_order_item_id;
end $$;

create or replace function public.set_item_availability(p_item_id uuid, p_available boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_rest uuid;
begin
  select restaurant_id into v_rest from public.menu_items where id = p_item_id;
  if v_rest is null or not public.is_staff(v_rest) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.menu_items set is_available = p_available where id = p_item_id;
end $$;

-- ---------------------------------------------------------------------
-- Service requests
-- ---------------------------------------------------------------------
create or replace function public.create_service_request(
  p_session_id uuid, p_type public.request_type, p_note text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_session public.table_sessions%rowtype;
  v_id uuid;
begin
  if not public.is_session_guest(p_session_id) then
    raise exception 'NOT_A_GUEST' using errcode = '42501';
  end if;
  select * into v_session from public.table_sessions where id = p_session_id;
  if v_session.status = 'closed' then
    raise exception 'SESSION_CLOSED' using errcode = 'P0001';
  end if;

  -- De-duplicate: one open request of each type per table.
  select id into v_id from public.service_requests
   where session_id = p_session_id and type = p_type and status <> 'resolved';
  if found then
    return v_id;
  end if;

  insert into public.service_requests (restaurant_id, session_id, table_id, type, note, created_by)
  values (v_session.restaurant_id, v_session.id, v_session.table_id, p_type,
          nullif(btrim(left(p_note, 200)), ''), auth.uid())
  returning id into v_id;

  if p_type = 'request_bill' then
    update public.table_sessions set status = 'billing' where id = p_session_id;
  end if;
  return v_id;
end $$;

create or replace function public.update_service_request(p_request_id uuid, p_status public.request_status)
returns void
language plpgsql security definer set search_path = public as $$
declare v_rest uuid;
begin
  select restaurant_id into v_rest from public.service_requests where id = p_request_id;
  if v_rest is null or not public.is_staff(v_rest) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.service_requests set
    status          = p_status,
    acknowledged_by = case when p_status in ('acknowledged','resolved') then coalesce(acknowledged_by, auth.uid()) else acknowledged_by end,
    acknowledged_at = case when p_status in ('acknowledged','resolved') then coalesce(acknowledged_at, now()) else acknowledged_at end,
    resolved_at     = case when p_status = 'resolved' then now() else resolved_at end
  where id = p_request_id;
end $$;

-- ---------------------------------------------------------------------
-- Billing
-- Bill = confirmed-or-later, non-cancelled orders, non-voided items.
-- service charge on subtotal; VAT on (subtotal + service).
-- ---------------------------------------------------------------------
create or replace function public.session_bill(p_session_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_session  public.table_sessions%rowtype;
  v_rest     public.restaurants%rowtype;
  v_subtotal bigint;
  v_service  bigint;
  v_vat      bigint;
  v_total    bigint;
  v_paid     bigint;
  v_pending  integer;
begin
  select * into v_session from public.table_sessions where id = p_session_id;
  if not found or not (public.is_staff(v_session.restaurant_id) or public.is_session_guest(p_session_id)) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into v_rest from public.restaurants where id = v_session.restaurant_id;

  select coalesce(sum(oi.line_total_minor), 0) into v_subtotal
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where o.session_id = p_session_id
     and o.status not in ('placed', 'cancelled')
     and not oi.is_voided;

  select count(*) into v_pending from public.orders
   where session_id = p_session_id and status = 'placed';

  v_service := round(v_subtotal * v_rest.service_charge_bps / 10000.0);
  v_vat     := round((v_subtotal + v_service) * v_rest.vat_bps / 10000.0);
  v_total   := v_subtotal + v_service + v_vat;

  select coalesce(sum(amount_minor), 0) into v_paid
    from public.payments where session_id = p_session_id and status = 'paid';

  return jsonb_build_object(
    'session_id',            p_session_id,
    'subtotal_minor',        v_subtotal,
    'service_charge_bps',    v_rest.service_charge_bps,
    'service_charge_minor',  v_service,
    'vat_bps',               v_rest.vat_bps,
    'vat_minor',             v_vat,
    'total_minor',           v_total,
    'paid_minor',            v_paid,
    'due_minor',             greatest(v_total - v_paid, 0),
    'unconfirmed_orders',    v_pending,
    'currency',              v_rest.currency
  );
end $$;

-- Cash (or card-machine) payment recorded by staff.
create or replace function public.record_cash_payment(
  p_session_id uuid, p_amount_minor integer, p_channel text default 'cash')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_session public.table_sessions%rowtype;
  v_id uuid;
begin
  select * into v_session from public.table_sessions where id = p_session_id for update;
  if not found or not public.is_staff(v_session.restaurant_id,
        array['owner','manager','cashier','waiter']::public.staff_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_session.status = 'closed' then
    raise exception 'SESSION_CLOSED' using errcode = 'P0001';
  end if;
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = '22023';
  end if;
  -- Record the amount applied to the bill (change given back is not stored).
  if p_amount_minor > (public.session_bill(p_session_id)->>'due_minor')::bigint then
    raise exception 'AMOUNT_EXCEEDS_DUE' using errcode = '22023';
  end if;
  insert into public.payments (restaurant_id, session_id, method, channel, amount_minor,
                               status, received_by, paid_at)
  values (v_session.restaurant_id, p_session_id, 'cash', coalesce(p_channel, 'cash'),
          p_amount_minor, 'paid', auth.uid(), now())
  returning id into v_id;
  return v_id;
end $$;

-- Online payment: called ONLY by the server (secret key) after the
-- SSLCommerz Validation API confirmed the transaction. Idempotent.
create or replace function public.mark_gateway_payment(
  p_tran_id text, p_val_id text, p_amount_minor integer,
  p_status public.payment_status, p_payload jsonb)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_pay public.payments%rowtype;
begin
  select * into v_pay from public.payments where tran_id = p_tran_id for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_pay.status = 'paid' then
    return v_pay;                       -- already processed (IPN + redirect both arrive)
  end if;
  if p_status = 'paid' and p_amount_minor <> v_pay.amount_minor then
    raise exception 'AMOUNT_MISMATCH' using errcode = 'P0001';
  end if;
  update public.payments set
    status          = p_status,
    gateway_val_id  = coalesce(p_val_id, gateway_val_id),
    gateway_payload = p_payload,
    paid_at         = case when p_status = 'paid' then now() else paid_at end
  where id = v_pay.id
  returning * into v_pay;
  return v_pay;
end $$;

-- Close the table (staff). Requires no unpaid balance unless a manager overrides.
create or replace function public.close_session(p_session_id uuid, p_force boolean default false)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_session public.table_sessions%rowtype;
  v_bill    jsonb;
begin
  select * into v_session from public.table_sessions where id = p_session_id for update;
  if not found or not public.is_staff(v_session.restaurant_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_session.status = 'closed' then
    return;
  end if;
  v_bill := public.session_bill(p_session_id);
  if (v_bill->>'due_minor')::bigint > 0 or (v_bill->>'unconfirmed_orders')::int > 0 then
    if not (p_force and public.is_staff(v_session.restaurant_id, array['owner','manager']::public.staff_role[])) then
      raise exception 'UNPAID_BALANCE' using errcode = 'P0001';
    end if;
  end if;
  update public.orders set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
         cancel_reason = 'Table closed'
   where session_id = p_session_id and status = 'placed';
  update public.service_requests set status = 'resolved', resolved_at = now()
   where session_id = p_session_id and status <> 'resolved';
  update public.table_sessions set status = 'closed', closed_at = now(), closed_by = auth.uid()
   where id = p_session_id;
end $$;

create or replace function public.submit_feedback(p_session_id uuid, p_rating smallint, p_comment text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_rest uuid;
begin
  if not public.is_session_guest(p_session_id) then
    raise exception 'NOT_A_GUEST' using errcode = '42501';
  end if;
  select restaurant_id into v_rest from public.table_sessions where id = p_session_id;
  insert into public.feedback (restaurant_id, session_id, user_id, rating, comment)
  values (v_rest, p_session_id, auth.uid(), p_rating, nullif(btrim(left(p_comment, 500)), ''))
  on conflict (session_id, user_id) do update
    set rating = excluded.rating, comment = excluded.comment;
end $$;

-- ---------------------------------------------------------------------
-- Live floor snapshot for the waiter's floor view (one round-trip).
-- ---------------------------------------------------------------------
create or replace function public.floor_snapshot()
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
                         'placed_at', o.placed_at, 'subtotal_minor', o.subtotal_minor)
                       order by o.placed_at), '[]'::jsonb)
                     from public.orders o where o.session_id = s.id and o.status <> 'cancelled'),
          'open_requests', (select coalesce(jsonb_agg(jsonb_build_object(
                         'id', r.id, 'type', r.type, 'status', r.status, 'created_at', r.created_at)
                       order by r.created_at), '[]'::jsonb)
                     from public.service_requests r where r.session_id = s.id and r.status <> 'resolved')
        ) end)
      order by t.label)
    from public.dining_tables t
    left join public.table_sessions s on s.table_id = t.id and s.status <> 'closed'
    where t.restaurant_id = v_rest and t.is_active
  ), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Reports (owner/manager)
-- ---------------------------------------------------------------------
create or replace function public.sales_report(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_rest uuid := public.my_restaurant_id();
begin
  if v_rest is null or not public.is_staff(v_rest, array['owner','manager']::public.staff_role[]) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'revenue_minor', (select coalesce(sum(amount_minor), 0) from public.payments
                      where restaurant_id = v_rest and status = 'paid' and paid_at >= p_from and paid_at < p_to),
    'orders', (select count(*) from public.orders
               where restaurant_id = v_rest and status <> 'cancelled' and placed_at >= p_from and placed_at < p_to),
    'avg_ticket_minor', (select coalesce(round(avg(subtotal_minor)), 0) from public.orders
               where restaurant_id = v_rest and status <> 'cancelled' and placed_at >= p_from and placed_at < p_to),
    'avg_confirm_seconds', (select coalesce(round(avg(extract(epoch from confirmed_at - placed_at))), 0)
               from public.orders where restaurant_id = v_rest and confirmed_at is not null
               and placed_at >= p_from and placed_at < p_to),
    'avg_kitchen_seconds', (select coalesce(round(avg(extract(epoch from ready_at - sent_at))), 0)
               from public.orders where restaurant_id = v_rest and ready_at is not null and sent_at is not null
               and placed_at >= p_from and placed_at < p_to),
    'by_method', (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from (
               select coalesce(channel, method::text) k, sum(amount_minor) v from public.payments
               where restaurant_id = v_rest and status = 'paid' and paid_at >= p_from and paid_at < p_to
               group by 1) m),
    'top_items', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
               select oi.name_snapshot as name, sum(oi.quantity) as qty, sum(oi.line_total_minor) as revenue_minor
               from public.order_items oi join public.orders o on o.id = oi.order_id
               where o.restaurant_id = v_rest and o.status not in ('placed','cancelled') and not oi.is_voided
                 and o.placed_at >= p_from and o.placed_at < p_to
               group by oi.name_snapshot order by qty desc limit 10) t),
    'by_hour', (select coalesce(jsonb_agg(h order by h.hour), '[]'::jsonb) from (
               select extract(hour from o.placed_at at time zone r.timezone)::int as hour, count(*) as orders
               from public.orders o join public.restaurants r on r.id = o.restaurant_id
               where o.restaurant_id = v_rest and o.status <> 'cancelled'
                 and o.placed_at >= p_from and o.placed_at < p_to
               group by 1) h),
    'avg_rating', (select round(avg(rating)::numeric, 2) from public.feedback
               where restaurant_id = v_rest and created_at >= p_from and created_at < p_to)
  );
end $$;

-- =====================================================================
-- Function privileges
-- Supabase grants EXECUTE to PUBLIC by default; lock it down explicitly.
-- =====================================================================
revoke execute on all functions in schema public from public, anon;

-- RLS helpers are evaluated inside policies that anon can hit (menu reads),
-- so anon needs EXECUTE on them. They return false for anon callers.
grant execute on function
  public.is_staff(uuid, public.staff_role[]),
  public.is_session_guest(uuid)
to anon;

grant execute on function
  public.staff_role_of(uuid),
  public.is_staff(uuid, public.staff_role[]),
  public.my_restaurant_id(),
  public.is_session_guest(uuid),
  public.join_table(text),
  public.place_order(uuid, jsonb, uuid, text),
  public.cancel_my_order(uuid),
  public.advance_order(uuid, public.order_status, text),
  public.waiter_adjust_items(uuid, jsonb),
  public.set_order_item_done(uuid, boolean),
  public.set_item_availability(uuid, boolean),
  public.create_service_request(uuid, public.request_type, text),
  public.update_service_request(uuid, public.request_status),
  public.session_bill(uuid),
  public.record_cash_payment(uuid, integer, text),
  public.close_session(uuid, boolean),
  public.submit_feedback(uuid, smallint, text),
  public.floor_snapshot(),
  public.sales_report(timestamptz, timestamptz)
to authenticated;

-- Server-only (secret key).
revoke execute on function public.mark_gateway_payment(text, text, integer, public.payment_status, jsonb)
  from public, anon, authenticated;
grant execute on function public.mark_gateway_payment(text, text, integer, public.payment_status, jsonb)
  to service_role;

-- =====================================================================
-- Realtime: tables whose changes the UIs listen to.
-- Postgres Changes respects the SELECT policies above, so each client only
-- receives rows it is allowed to see. Treat each event as a signal to
-- refetch, not as the source of truth.
-- =====================================================================
alter publication supabase_realtime add table
  public.orders, public.order_items, public.service_requests,
  public.table_sessions, public.payments, public.menu_items;

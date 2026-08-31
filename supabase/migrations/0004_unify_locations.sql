-- Generalizes "stands" into a unified `locations` concept (warehouse, stand,
-- kitchen) so TRANSFER can move stock between any two locations, not just
-- Warehouse -> Stand. Also adds ORDER (purchase orders) and REQUEST (stock
-- requests) as their own lightweight tables, since neither moves physical
-- stock the way RECEIVE/RETURN/TRANSFER/ADJUST do.
--
-- All affected tables are empty (pre-launch), so this rebuilds rather than
-- ALTERs them for clarity.

drop table if exists stand_count_lines cascade;
drop table if exists stand_counts cascade;
drop table if exists waste_records cascade;
drop table if exists inventory_thresholds cascade;
drop table if exists stand_products cascade;
drop table if exists event_stand_assignments cascade;
drop table if exists inventory_movements cascade;
drop table if exists stands cascade;
drop function if exists is_assigned_to_stand(uuid, uuid);
drop type if exists movement_type cascade;

create type location_type as enum ('warehouse', 'stand', 'kitchen');
create type movement_type as enum ('receiving', 'return', 'transfer', 'adjustment');
create type po_status as enum ('placed', 'received', 'canceled');
create type request_status as enum ('pending', 'fulfilled', 'canceled');

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type location_type not null default 'stand',
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into locations (name, type, description) values
  ('Warehouse - Main', 'warehouse', 'Concession & catering supplies'),
  ('Warehouse - Alcohol', 'warehouse', 'Locked room - liquor & wine, its own receiving location'),
  ('Kitchen', 'kitchen', null);

create table event_location_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  location_lead_user_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (event_id, location_id)
);

create table location_products (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  storage_area_id uuid not null references storage_areas (id) on delete restrict,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (location_id, product_id)
);

create index on location_products (location_id, storage_area_id);

create table inventory_thresholds (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  reorder_threshold numeric(10, 2) not null default 0,
  reorder_qty numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, location_id)
);

create index on inventory_thresholds (location_id);

-- COUNT: event_id is nullable so Warehouse/Kitchen can run a standalone
-- count (e.g. a periodic audit) that isn't tied to a specific concert.
create table location_counts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete restrict,
  type count_type not null,
  submitted_at timestamptz not null default now(),
  csv_export_url text
);

create unique index location_counts_event_unique
  on location_counts (event_id, location_id, type) where event_id is not null;

create table location_count_lines (
  id uuid primary key default gen_random_uuid(),
  location_count_id uuid not null references location_counts (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  qty_each numeric(10, 2),
  qty_cases numeric(10, 2),
  counted_at timestamptz not null default now(),
  constraint location_count_lines_qty_present check (qty_each is not null or qty_cases is not null)
);

create index on location_count_lines (location_count_id);

-- WASTE: at any location.
create table waste_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity numeric(10, 2) not null,
  reason_code waste_reason not null,
  note text,
  photo_url text,
  user_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index on waste_records (location_id);

-- RECEIVE / RETURN / TRANSFER / ADJUST all move (or correct) stock and share
-- one ledger. NULL from_location_id or to_location_id means "external"
-- (the supplier); supplier_id is set whenever either side is external.
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  from_location_id uuid references locations (id) on delete restrict,
  to_location_id uuid references locations (id) on delete restrict,
  supplier_id uuid references suppliers (id) on delete restrict,
  type movement_type not null,
  quantity numeric(10, 2) not null,
  event_id uuid references events (id) on delete set null,
  note text,
  user_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint inventory_movements_endpoint_present check (
    from_location_id is not null or to_location_id is not null
  )
);

create index on inventory_movements (product_id);
create index on inventory_movements (from_location_id);
create index on inventory_movements (to_location_id);

-- ORDER: a purchase order placed with a supplier. No stock moves until the
-- delivery is logged as a RECEIVE (optionally referencing this order).
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete restrict,
  location_id uuid not null references locations (id) on delete restrict,
  status po_status not null default 'placed',
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- REQUEST: a location signaling it needs more of a product. Usually
-- fulfilled by a TRANSFER, tracked here once it is.
create table stock_requests (
  id uuid primary key default gen_random_uuid(),
  from_location_id uuid not null references locations (id) on delete cascade,
  to_location_id uuid references locations (id) on delete set null,
  product_id uuid not null references products (id) on delete cascade,
  quantity numeric(10, 2) not null,
  status request_status not null default 'pending',
  fulfilled_by_movement_id uuid references inventory_movements (id) on delete set null,
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Replaces is_assigned_to_stand: same idea, generalized to any location type.
create or replace function is_assigned_to_stand(check_event_id uuid, check_location_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from event_location_assignments
    where event_id = check_event_id
      and location_id = check_location_id
      and location_lead_user_id = auth.uid()
  );
$$;

alter table locations enable row level security;
alter table event_location_assignments enable row level security;
alter table location_products enable row level security;
alter table inventory_thresholds enable row level security;
alter table location_counts enable row level security;
alter table location_count_lines enable row level security;
alter table waste_records enable row level security;
alter table inventory_movements enable row level security;
alter table purchase_orders enable row level security;
alter table stock_requests enable row level security;

create policy "locations_select_all" on locations for select using (auth.role() = 'authenticated');
create policy "locations_admin_write" on locations for all using (is_admin()) with check (is_admin());

create policy "event_location_assignments_select_all" on event_location_assignments for select using (auth.role() = 'authenticated');
create policy "event_location_assignments_admin_write" on event_location_assignments for all using (is_admin()) with check (is_admin());

create policy "location_products_select" on location_products for select using (
  is_warehouse() or exists (
    select 1 from event_location_assignments ela
    where ela.location_id = location_products.location_id
      and ela.location_lead_user_id = auth.uid()
  )
);
create policy "location_products_admin_write" on location_products for all using (is_admin()) with check (is_admin());

create policy "thresholds_select_all" on inventory_thresholds for select using (auth.role() = 'authenticated');
create policy "thresholds_admin_write" on inventory_thresholds for all using (is_admin()) with check (is_admin());

create policy "location_counts_select" on location_counts for select using (
  is_warehouse() or is_assigned_to_stand(event_id, location_id)
);
create policy "location_counts_insert" on location_counts for insert with check (
  is_warehouse() or (is_assigned_to_stand(event_id, location_id) and user_id = auth.uid())
);
create policy "location_counts_update" on location_counts for update using (
  is_warehouse() or (is_assigned_to_stand(event_id, location_id) and user_id = auth.uid())
);

create policy "location_count_lines_select" on location_count_lines for select using (
  is_warehouse() or exists (
    select 1 from location_counts lc
    where lc.id = location_count_lines.location_count_id
      and is_assigned_to_stand(lc.event_id, lc.location_id)
  )
);
create policy "location_count_lines_write" on location_count_lines for all using (
  is_warehouse() or exists (
    select 1 from location_counts lc
    where lc.id = location_count_lines.location_count_id
      and is_assigned_to_stand(lc.event_id, lc.location_id)
      and lc.user_id = auth.uid()
  )
) with check (
  is_warehouse() or exists (
    select 1 from location_counts lc
    where lc.id = location_count_lines.location_count_id
      and is_assigned_to_stand(lc.event_id, lc.location_id)
      and lc.user_id = auth.uid()
  )
);

create policy "waste_select" on waste_records for select using (
  is_warehouse() or is_assigned_to_stand(event_id, location_id)
);
create policy "waste_write" on waste_records for all using (
  is_warehouse() or (is_assigned_to_stand(event_id, location_id) and user_id = auth.uid())
) with check (
  is_warehouse() or (is_assigned_to_stand(event_id, location_id) and user_id = auth.uid())
);

create policy "movements_select" on inventory_movements for select using (auth.role() = 'authenticated');
create policy "movements_write" on inventory_movements for all using (is_warehouse()) with check (is_warehouse());

create policy "purchase_orders_select" on purchase_orders for select using (auth.role() = 'authenticated');
create policy "purchase_orders_write" on purchase_orders for all using (is_warehouse()) with check (is_warehouse());

create policy "stock_requests_select" on stock_requests for select using (auth.role() = 'authenticated');
create policy "stock_requests_insert" on stock_requests for insert with check (
  is_warehouse() or exists (
    select 1 from event_location_assignments ela
    where ela.location_id = stock_requests.from_location_id
      and ela.location_lead_user_id = auth.uid()
  )
);
create policy "stock_requests_update" on stock_requests for update using (is_warehouse());

-- Venue Inventory Tracking: initial schema
-- Roles: admin | warehouse | stand_lead

create type user_role as enum ('admin', 'warehouse', 'stand_lead');
create type event_status as enum ('upcoming', 'open', 'closed');
create type count_type as enum ('opening', 'closing');
create type movement_type as enum ('receiving', 'replenishment');
create type waste_reason as enum ('spoiled', 'broken', 'spilled', 'expired', 'theft_loss', 'other');

-- One row per authenticated user, mirrors auth.users
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role user_role not null default 'stand_lead',
  created_at timestamptz not null default now()
);

create table stands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  status event_status not null default 'upcoming',
  created_at timestamptz not null default now()
);

create table event_stand_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  stand_id uuid not null references stands (id) on delete cascade,
  stand_lead_user_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (event_id, stand_id)
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  description text not null,
  supplier_id uuid references suppliers (id) on delete set null,
  unit_cost numeric(10, 2),
  unit_of_measure text not null default 'each',
  pack_size text,
  photo_url text,
  active boolean not null default true,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table product_barcodes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  barcode text not null unique,
  created_at timestamptz not null default now()
);

create table inventory_thresholds (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  stand_id uuid not null references stands (id) on delete cascade,
  reorder_threshold numeric(10, 2) not null default 0,
  reorder_qty numeric(10, 2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, stand_id)
);

create table stand_counts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  stand_id uuid not null references stands (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete restrict,
  type count_type not null,
  submitted_at timestamptz not null default now(),
  csv_export_url text,
  unique (event_id, stand_id, type)
);

create table stand_count_lines (
  id uuid primary key default gen_random_uuid(),
  stand_count_id uuid not null references stand_counts (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity numeric(10, 2) not null,
  counted_at timestamptz not null default now()
);

create table waste_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  stand_id uuid not null references stands (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity numeric(10, 2) not null,
  reason_code waste_reason not null,
  note text,
  photo_url text,
  user_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  from_location text not null default 'external', -- 'external' | 'warehouse'
  to_stand_id uuid references stands (id) on delete set null, -- null when receiving into warehouse
  event_id uuid references events (id) on delete set null,
  type movement_type not null,
  quantity numeric(10, 2) not null,
  user_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Admin-editable mapping of internal field -> Yellow Dog CSV column header.
-- Seeded with a reasonable default; update once the real Yellow Dog
-- physical-count import template is available.
create table yellow_dog_field_mapping (
  id uuid primary key default gen_random_uuid(),
  internal_field text not null unique,
  csv_column_header text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

insert into yellow_dog_field_mapping (internal_field, csv_column_header, sort_order) values
  ('stand_name', 'Stand', 0),
  ('sku', 'SKU', 1),
  ('barcode', 'UPC', 2),
  ('description', 'Description', 3),
  ('quantity', 'Quantity', 4),
  ('record_type', 'Record Type', 5),
  ('reason_code', 'Reason Code', 6),
  ('counted_at', 'Date/Time', 7),
  ('counted_by', 'Counted By', 8);

create index on product_barcodes (barcode);
create index on stand_count_lines (stand_count_id);
create index on waste_records (event_id, stand_id);
create index on inventory_movements (product_id);
create index on inventory_thresholds (stand_id);

-- Helper: current user's role, used throughout RLS policies
create or replace function current_user_role() returns user_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select current_user_role() = 'admin';
$$;

create or replace function is_warehouse() returns boolean
language sql stable security definer as $$
  select current_user_role() in ('admin', 'warehouse');
$$;

create or replace function is_assigned_to_stand(check_event_id uuid, check_stand_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from event_stand_assignments
    where event_id = check_event_id
      and stand_id = check_stand_id
      and stand_lead_user_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table stands enable row level security;
alter table events enable row level security;
alter table event_stand_assignments enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table product_barcodes enable row level security;
alter table inventory_thresholds enable row level security;
alter table stand_counts enable row level security;
alter table stand_count_lines enable row level security;
alter table waste_records enable row level security;
alter table inventory_movements enable row level security;
alter table yellow_dog_field_mapping enable row level security;

-- profiles: everyone can read (needed for name lookups/assignments); only admin writes
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_self" on profiles for update using (id = auth.uid());
create policy "profiles_admin_write" on profiles for all using (is_admin()) with check (is_admin());

-- reference data: all authenticated users read; admin writes
create policy "stands_select_all" on stands for select using (auth.role() = 'authenticated');
create policy "stands_admin_write" on stands for all using (is_admin()) with check (is_admin());

create policy "events_select_all" on events for select using (auth.role() = 'authenticated');
create policy "events_admin_write" on events for all using (is_admin()) with check (is_admin());

create policy "assignments_select_all" on event_stand_assignments for select using (auth.role() = 'authenticated');
create policy "assignments_admin_write" on event_stand_assignments for all using (is_admin()) with check (is_admin());

create policy "suppliers_select_all" on suppliers for select using (auth.role() = 'authenticated');
create policy "suppliers_admin_write" on suppliers for all using (is_admin()) with check (is_admin());

create policy "products_select_all" on products for select using (auth.role() = 'authenticated');
create policy "products_write_warehouse_or_admin" on products for insert with check (is_warehouse());
create policy "products_update_warehouse_or_admin" on products for update using (is_warehouse());
create policy "products_delete_admin" on products for delete using (is_admin());

create policy "barcodes_select_all" on product_barcodes for select using (auth.role() = 'authenticated');
create policy "barcodes_write_warehouse_or_admin" on product_barcodes for all using (is_warehouse()) with check (is_warehouse());

create policy "thresholds_select_all" on inventory_thresholds for select using (auth.role() = 'authenticated');
create policy "thresholds_admin_write" on inventory_thresholds for all using (is_admin()) with check (is_admin());

-- stand_counts: admin/warehouse see everything; stand leads see/act only on their assignment
create policy "stand_counts_select" on stand_counts for select using (
  is_warehouse() or is_assigned_to_stand(event_id, stand_id)
);
create policy "stand_counts_insert" on stand_counts for insert with check (
  is_warehouse() or (is_assigned_to_stand(event_id, stand_id) and user_id = auth.uid())
);
create policy "stand_counts_update" on stand_counts for update using (
  is_warehouse() or (is_assigned_to_stand(event_id, stand_id) and user_id = auth.uid())
);

create policy "stand_count_lines_select" on stand_count_lines for select using (
  is_warehouse() or exists (
    select 1 from stand_counts sc
    where sc.id = stand_count_lines.stand_count_id
      and is_assigned_to_stand(sc.event_id, sc.stand_id)
  )
);
create policy "stand_count_lines_write" on stand_count_lines for all using (
  is_warehouse() or exists (
    select 1 from stand_counts sc
    where sc.id = stand_count_lines.stand_count_id
      and is_assigned_to_stand(sc.event_id, sc.stand_id)
      and sc.user_id = auth.uid()
  )
) with check (
  is_warehouse() or exists (
    select 1 from stand_counts sc
    where sc.id = stand_count_lines.stand_count_id
      and is_assigned_to_stand(sc.event_id, sc.stand_id)
      and sc.user_id = auth.uid()
  )
);

create policy "waste_select" on waste_records for select using (
  is_warehouse() or is_assigned_to_stand(event_id, stand_id)
);
create policy "waste_write" on waste_records for all using (
  is_warehouse() or (is_assigned_to_stand(event_id, stand_id) and user_id = auth.uid())
) with check (
  is_warehouse() or (is_assigned_to_stand(event_id, stand_id) and user_id = auth.uid())
);

-- movements: warehouse/admin only (receiving + replenishment are warehouse-side actions)
create policy "movements_select" on inventory_movements for select using (auth.role() = 'authenticated');
create policy "movements_write" on inventory_movements for all using (is_warehouse()) with check (is_warehouse());

create policy "yd_mapping_select" on yellow_dog_field_mapping for select using (auth.role() = 'authenticated');
create policy "yd_mapping_admin_write" on yellow_dog_field_mapping for all using (is_admin()) with check (is_admin());

-- Auto-create a profile row when a new auth user is created.
-- New users default to 'stand_lead'; an admin promotes them afterward.
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, 'stand_lead');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

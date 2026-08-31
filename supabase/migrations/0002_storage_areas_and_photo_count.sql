-- Replaces barcode-based stand counting with a photo-grid / accordion browse UI,
-- grouped by storage area (Wine Fridge, Beer Cage, etc.), with independent
-- Each / Case quantity entry (no auto-conversion between the two).

create table storage_areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into storage_areas (code, name, sort_order) values
  ('WF', 'Wine Fridge', 0),
  ('BF', 'Beer Fridge', 1),
  ('LC', 'Liquor Cage', 2),
  ('BC', 'Beer Cage', 3),
  ('DS', 'Disposables', 4),
  ('CL', 'Cleaning', 5),
  ('MX', 'Mixers', 6),
  ('BIB', 'Bag-In-Box', 7),
  ('DK', 'Draft Keg', 8),
  ('SV', 'Souvenir', 9),
  ('WC', 'Walk-in Cooler', 10),
  ('OT', 'Other', 11);

-- Which products are tracked at which stand, and which storage area's
-- accordion section they appear under there.
create table stand_products (
  id uuid primary key default gen_random_uuid(),
  stand_id uuid not null references stands (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  storage_area_id uuid not null references storage_areas (id) on delete restrict,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (stand_id, product_id)
);

create index on stand_products (stand_id, storage_area_id);

alter table storage_areas enable row level security;
alter table stand_products enable row level security;

create policy "storage_areas_select_all" on storage_areas for select using (auth.role() = 'authenticated');
create policy "storage_areas_admin_write" on storage_areas for all using (is_admin()) with check (is_admin());

create policy "stand_products_select" on stand_products for select using (
  is_warehouse() or exists (
    select 1 from event_stand_assignments esa
    where esa.stand_id = stand_products.stand_id
      and esa.stand_lead_user_id = auth.uid()
  )
);
create policy "stand_products_admin_write" on stand_products for all using (is_admin()) with check (is_admin());

-- Stand counts move from a single scanned "quantity" to independent Each /
-- Case entry (a photo tile can carry both an EA and a CS count).
alter table stand_count_lines rename column quantity to qty_each;
alter table stand_count_lines alter column qty_each drop not null;
alter table stand_count_lines add column qty_cases numeric(10, 2);
alter table stand_count_lines add constraint stand_count_lines_qty_present
  check (qty_each is not null or qty_cases is not null);

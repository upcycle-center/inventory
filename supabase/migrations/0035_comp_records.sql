-- Comps logged on the Closing count sheet -- tracked separately from
-- waste_records since comps get their own report, not a dashboard rollup.
create table comp_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  quantity numeric(10, 2) not null,
  note text,
  user_id uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index on comp_records (location_id);
create index on comp_records (event_id);

alter table comp_records enable row level security;

create policy "comp_select" on comp_records for select using (
  is_warehouse() or is_ops() or is_assigned_to_stand(event_id, location_id)
);
create policy "comp_write" on comp_records for all using (
  is_warehouse() or (is_assigned_to_stand(event_id, location_id) and user_id = auth.uid())
) with check (
  is_warehouse() or (is_assigned_to_stand(event_id, location_id) and user_id = auth.uid())
);

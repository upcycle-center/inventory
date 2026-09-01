-- Month-end reconciliation: moEND is a hybrid of a live-calculated value
-- (the latest count-sheet entry within that calendar month, computed on
-- the fly — never stored, so it can't go stale) and an optional posted
-- physical count (a deliberate audit entry from Finance/Ops). Once a
-- physical count is posted for a month, it's the authoritative value —
-- moSTART for the following month carries forward from it (falling back to
-- the calculated value for months nobody ever physically counted).
--
-- Only the physical entry is persisted; the calculated side is derived at
-- read time from location_count_lines, so no snapshot job is needed here.

create table location_product_month_end (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  physical_qty_each numeric(10, 2),
  physical_qty_cases numeric(10, 2),
  counted_by uuid references profiles (id) on delete set null,
  counted_at timestamptz not null default now(),
  unique (location_id, product_id, year, month)
);

create index on location_product_month_end (location_id, year, month);

alter table location_product_month_end enable row level security;

create policy "month_end_select_all" on location_product_month_end for select using (auth.role() = 'authenticated');
create policy "month_end_admin_write" on location_product_month_end for all using (is_admin()) with check (is_admin());

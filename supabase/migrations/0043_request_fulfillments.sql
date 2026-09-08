-- Logs each "Mark fulfilled" action on a restock request with who/when and
-- how much actually went out in the drop -- Warehouse/Admin can confirm the
-- full requested_qty as delivered, or post an adjusted fulfilled_qty for a
-- partial drop. fulfillment_pct is computed once at fulfillment time
-- (fulfilled_qty / requested_qty), not recomputed later, so the historical
-- record stays accurate even if reorder_qty on the live threshold row
-- changes afterward.
create table request_fulfillments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  location_id uuid not null references locations (id) on delete cascade,
  requested_qty numeric(10, 2),
  fulfilled_qty numeric(10, 2) not null,
  fulfillment_pct numeric(6, 2) not null,
  requested_by uuid references profiles (id) on delete set null,
  requested_at timestamptz,
  fulfilled_by uuid not null references profiles (id) on delete restrict,
  fulfilled_at timestamptz not null default now()
);

create index on request_fulfillments (location_id);
create index on request_fulfillments (product_id);

alter table request_fulfillments enable row level security;

create policy "request_fulfillments_select" on request_fulfillments for select using (is_warehouse());
create policy "request_fulfillments_write" on request_fulfillments for all using (
  current_user_role() in ('admin', 'warehouse')
) with check (
  current_user_role() in ('admin', 'warehouse')
);

-- Warehouse loses the ability to outright delete a restock request; the
-- replacement is a "Deny" action with a required reason code, logged here
-- so the reason isn't just silently lost the way a delete would be.
-- Admin keeps the true delete (a mistaken/duplicate entry, no reason
-- needed) via inventory_thresholds directly.
create table request_denials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete restrict,
  location_id uuid not null references locations (id) on delete cascade,
  reorder_threshold numeric(10, 2),
  requested_by uuid references profiles (id) on delete set null,
  requested_at timestamptz,
  reason_code text not null check (reason_code in ('OOS', 'RSV', 'OTH')),
  denied_by uuid not null references profiles (id) on delete restrict,
  denied_at timestamptz not null default now()
);

create index on request_denials (location_id);
create index on request_denials (product_id);

alter table request_denials enable row level security;

create policy "request_denials_select" on request_denials for select using (is_warehouse());
create policy "request_denials_write" on request_denials for all using (
  current_user_role() in ('admin', 'warehouse')
) with check (
  current_user_role() in ('admin', 'warehouse')
);

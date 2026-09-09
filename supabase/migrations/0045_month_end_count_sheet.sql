-- Month-End Count: a per-location count sheet, independent of any event,
-- that posts straight to location_product_month_end (the same table the
-- admin's one-by-one Location Details entry already writes to) instead of
-- requiring an admin to type every product in by hand.
--
-- It also doubles as the intake for items staff find in the field that
-- aren't in the catalog yet -- hand-typed here, batched into this table
-- for a YellowDog manager to review and add as real Products.
create table month_end_new_item_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  barcode text,
  brand text,
  product_name text not null,
  case_count numeric(10, 2),
  size_each text,
  reported_by uuid not null references profiles (id) on delete restrict,
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles (id) on delete set null
);

create index on month_end_new_item_reports (location_id);
create index on month_end_new_item_reports (resolved_at);

alter table month_end_new_item_reports enable row level security;

create policy "month_end_new_item_reports_select" on month_end_new_item_reports for select using (
  auth.role() = 'authenticated'
);
create policy "month_end_new_item_reports_insert" on month_end_new_item_reports for insert with check (
  auth.role() = 'authenticated'
);
create policy "month_end_new_item_reports_admin_resolve" on month_end_new_item_reports for update using (
  is_admin()
) with check (
  is_admin()
);

-- New configurable view -- same admin-editable matrix as Count/Request/etc.
-- Defaults to on for every role Count is on for today.
insert into role_view_permissions (role, view_key, allowed) values
  ('warehouse', 'month_end', true),
  ('kitchen', 'month_end', true),
  ('catering', 'month_end', true),
  ('ops', 'month_end', true),
  ('stand_lead', 'month_end', true);

-- location_product_month_end was admin-only (0018) since the only way to
-- post to it was the admin's one-by-one Location Details entry. Now that
-- it's also posted in bulk from a location's own Month-End Count Sheet,
-- open writes to the same roles/scope Transfer and Recovery already use:
-- any manager role, or the stand_lead actually assigned to that location
-- (is_stand_lead_for_location, from 0039).
drop policy if exists "month_end_admin_write" on location_product_month_end;
create policy "month_end_write" on location_product_month_end for all using (
  current_user_role() in ('admin', 'warehouse', 'kitchen', 'catering', 'ops')
  or (current_user_role() = 'stand_lead' and is_stand_lead_for_location(location_id))
) with check (
  current_user_role() in ('admin', 'warehouse', 'kitchen', 'catering', 'ops')
  or (current_user_role() = 'stand_lead' and is_stand_lead_for_location(location_id))
);

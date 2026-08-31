-- Adds an "ops" role (Operations: read-only access to dashboards/reports,
-- no write access anywhere) and locks catalog/system writes down to admin
-- only. Previously "warehouse" could create/edit products and upload
-- product photos; that's now admin-only, matching locations/suppliers/
-- storage areas/thresholds/Yellow Dog mapping, which were already
-- admin-only. Warehouse keeps write access to the operational ledger
-- (movements, purchase orders, stock requests) and counts/waste.

alter type user_role add value 'ops';

create or replace function is_ops() returns boolean
language sql stable security definer as $$
  select current_user_role() in ('admin', 'ops');
$$;

-- Products / barcodes / product photos: admin-only writes (was warehouse-or-admin).
drop policy if exists "products_write_warehouse_or_admin" on products;
drop policy if exists "products_update_warehouse_or_admin" on products;
create policy "products_admin_write" on products for all using (is_admin()) with check (is_admin());

drop policy if exists "barcodes_write_warehouse_or_admin" on product_barcodes;
create policy "barcodes_admin_write" on product_barcodes for all using (is_admin()) with check (is_admin());

drop policy if exists "product_photos_warehouse_write" on storage.objects;
drop policy if exists "product_photos_warehouse_update" on storage.objects;
create policy "product_photos_admin_write"
on storage.objects for insert
with check (bucket_id = 'product-photos' and is_admin());
create policy "product_photos_admin_update"
on storage.objects for update
using (bucket_id = 'product-photos' and is_admin());

-- Reporting reads for "ops": everything counts/waste/movements-related,
-- read-only, across all locations (no is_assigned_to_stand scoping).
drop policy if exists "location_counts_select" on location_counts;
create policy "location_counts_select" on location_counts for select using (
  is_warehouse() or is_ops() or is_assigned_to_stand(event_id, location_id)
);

drop policy if exists "location_count_lines_select" on location_count_lines;
create policy "location_count_lines_select" on location_count_lines for select using (
  is_warehouse() or is_ops() or exists (
    select 1 from location_counts lc
    where lc.id = location_count_lines.location_count_id
      and is_assigned_to_stand(lc.event_id, lc.location_id)
  )
);

drop policy if exists "waste_select" on waste_records;
create policy "waste_select" on waste_records for select using (
  is_warehouse() or is_ops() or is_assigned_to_stand(event_id, location_id)
);

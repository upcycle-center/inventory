-- The Restock Requests queue (/restock-requests) is meant for Warehouse
-- staff too, not just Admin — they need to be able to mark a request
-- fulfilled, which is a write to inventory_thresholds.
drop policy if exists "thresholds_admin_write" on inventory_thresholds;
create policy "thresholds_write" on inventory_thresholds for all using (is_warehouse()) with check (is_warehouse());

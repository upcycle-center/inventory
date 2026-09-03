-- Transfer needs to remember the CS/EA split the sender entered (not just
-- the each-equivalent total in `quantity`), so a future transfer log/report
-- can show it back the way it was keyed in. Nullable and only populated by
-- Transfer for now -- other movement types keep using `quantity` alone.
alter table inventory_movements add column qty_cases numeric(10, 2);
alter table inventory_movements add column qty_each numeric(10, 2);

-- Structured reason for a 'return' movement (Wrong Item, Broken/Damaged,
-- Expired, Did Not Order, Other) — enforced by the app's dropdown, not a
-- DB enum, so the option list can change without a migration.
alter table inventory_movements add column reason_code text;

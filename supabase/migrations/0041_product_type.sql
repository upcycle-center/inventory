-- Disposables/consumables (cups, carafes, koozies, napkins) get their own
-- section on the Products page, reusing the exact same product record --
-- location assignment, storage areas, count sheets, thresholds, and bulk
-- upload all already work per-product regardless of what it's for. This
-- flag is purely how the Products admin page tells the two apart.
create type product_type as enum ('sellable', 'consumable');
alter table products add column product_type product_type not null default 'sellable';

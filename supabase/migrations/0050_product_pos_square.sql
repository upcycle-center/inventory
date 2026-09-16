-- Marks a product for inclusion in the Square POS data-map export
-- (Admin > Data Maps > Square POS) -- distinct from Yellow Dog matching,
-- which is done purely by sku/upc with no per-product flag.
alter table products add column pos_square boolean not null default false;

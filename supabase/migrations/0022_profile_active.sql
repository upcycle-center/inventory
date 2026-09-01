-- Deactivating a user (rather than hard-deleting) preserves their history
-- on counts, assignments, and other records that reference them — the
-- same restrict-on-delete pattern already used for locations/products.
alter table profiles add column active boolean not null default true;

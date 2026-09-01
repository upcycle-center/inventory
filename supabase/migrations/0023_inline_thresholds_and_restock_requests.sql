-- Threshold management moves from its own admin page onto the Location
-- Details "Assigned Items" table, inline per product. The same
-- (location, product) row also becomes a persistent restock request: a
-- Stand/Warehouse "Request" checkbox sets requested_at/requested_by, and
-- it stays flagged until someone on the Restock Requests page marks it
-- fulfilled (clearing both columns) — rather than a one-off CSV export.
alter table inventory_thresholds add column requested_at timestamptz;
alter table inventory_thresholds add column requested_by uuid references profiles (id) on delete set null;

-- Opt-in recipient list for the daily low-stock report email, managed
-- from Admin -> Users instead of a static env var.
alter table profiles add column receives_low_stock_report boolean not null default false;

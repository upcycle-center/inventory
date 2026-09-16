-- A third, per-product-configurable counting tier between Case and Each --
-- e.g. a Sleeve of 50 cups, or a Pack of 12 napkins. middle_unit_label is
-- null when a product has no middle tier (existing Case/Each-only
-- behavior, unaffected). middle_unit_size is "each per middle unit", so
-- combined with the existing case_size ("each per case") every quantity
-- still reduces to a single each-equivalent number. each_countable lets a
-- product (e.g. napkins/flatware) drop the Each tier entirely -- counted
-- only in Case and/or the middle unit.
alter table products add column middle_unit_label text;
alter table products add column middle_unit_size numeric(10, 2);
alter table products add column each_countable boolean not null default true;

alter table location_count_lines add column qty_middle_unit numeric(10, 2);
alter table location_product_month_end add column physical_qty_middle_unit numeric(10, 2);
alter table inventory_movements add column qty_middle_unit numeric(10, 2);

-- A line for a middle-unit-only product (e.g. napkins counted only in
-- Pack, each_countable = false) may now have neither qty_each nor
-- qty_cases set -- widen the "at least one quantity present" check to
-- include the new column.
alter table location_count_lines drop constraint location_count_lines_qty_present;
alter table location_count_lines add constraint location_count_lines_qty_present
  check (qty_each is not null or qty_cases is not null or qty_middle_unit is not null);

-- Cost is now always entered per CASE, with per-EACH cost always derived
-- from case_size (no more branching on unit_of_measure for cost math).
-- sale_price (per EACH, the retail unit) drives retail-value reporting.
alter table products rename column unit_cost to case_cost;
alter table products add column sale_price numeric(10, 2);

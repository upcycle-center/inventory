-- Replace the free-text pack_size ("case of 12") with a structured numeric
-- case_size (units per case), so it's an actual data point rather than
-- prose. unit_of_measure stays but is now chosen from a fixed list in the UI.

alter table products add column case_size numeric(10, 2);
alter table products drop column pack_size;

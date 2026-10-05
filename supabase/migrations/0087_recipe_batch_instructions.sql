-- Batch-prep instructions (how to mix/store the pre-made batch itself),
-- separate from the per-serving "SERVICE" instructions -- shown on the
-- Ops Sheet PDF right under the BATCH SERVICE table.
alter table recipes add column if not exists batch_instructions text;

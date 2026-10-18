-- Alternate sizing for products measured by weight rather than fluid
-- volume (e.g. a bag of coffee) -- bottle_size_ml/ML_PER_OZ assumes
-- every product's size is a fluid volume, which silently breaks (or
-- mis-converts) anything priced/consumed by weight. Recipe cost-per-oz
-- falls back to this when bottle_size_ml is null.
alter table products add column if not exists weight_oz numeric;

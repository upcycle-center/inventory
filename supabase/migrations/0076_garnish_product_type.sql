-- New Product Type for recipe garnishes (limes, cherries, olives, etc.)
-- -- a perishable, never-billed-on-its-own ingredient, distinct from
-- Disposables/Cleaning (non-perishable supplies).
alter type product_type add value if not exists 'garnish';

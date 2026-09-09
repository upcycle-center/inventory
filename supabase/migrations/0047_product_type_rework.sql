-- Product Type moves from a plain Sellable/Consumable split to a
-- 4-way classification that also drives TOT Retail's valuation:
--   chargeable            -- sold in single units, uses Sale price (was 'sellable')
--   non_chargeable_bottle -- liquor/wine, poured rather than sold whole --
--                            TOT Retail projects value off pours per bottle
--   non_chargeable_mixer  -- bar mixers (sour mix, soda water, tonic,
--                            juices) -- cocktail ingredients, never billed
--                            on their own, no retail value
--   disposable            -- cups, napkins, cleaning supplies (was 'consumable')
--
-- No products need backfilling into the two new values -- they didn't
-- exist as a concept before, so nothing currently maps to them; an admin
-- reclassifies affected liquor/mixer products by hand afterward.
alter type product_type rename value 'sellable' to 'chargeable';
alter type product_type rename value 'consumable' to 'disposable';
alter type product_type add value 'non_chargeable_bottle';
alter type product_type add value 'non_chargeable_mixer';

-- Superseded by product_type = 'non_chargeable_bottle' -- a product's own
-- Type now decides whether TOT Retail projects pours instead of a flat
-- category-level flag. Category stays purely a GL Code label.
alter table product_categories drop column is_pour_based;

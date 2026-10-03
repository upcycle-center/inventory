-- Recipe sizes become fixed concession cup volumes (9oz Wine, 10oz
-- Single, 16oz Double) plus the existing 1L Carafe/2.5gal Bubbler batch
-- sizes, instead of scaling whatever the entered ingredients happen to
-- total. An ingredient can now be a "Top Off" (quantity_oz null) --
-- fills whatever's left in the cup after the measured ingredients,
-- rather than a fixed amount.
alter table recipe_ingredients alter column quantity_oz drop not null;
alter type recipe_request_size add value if not exists 'wine';

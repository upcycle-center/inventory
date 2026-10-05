-- Recipes get a Category, same list Products use (e.g. "Concessions
-- Liquor") -- lets a cocktail recipe be grouped with its GL/revenue
-- category for reporting, consistent with how Products are categorized.
alter table recipes add column if not exists category_id uuid references product_categories(id);

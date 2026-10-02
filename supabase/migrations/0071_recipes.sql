-- Recipes: cost a drink recipe at Single Serving, Double Serving, 1L
-- Batch, and 2.5gal Batch, with a recommended MSRP derived from a target
-- pour-cost % (computed in the app, not stored). Ingredients are
-- existing Products with a quantity in fluid ounces per single serving;
-- everything else scales off that base.
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity_oz numeric(8, 3) not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

create policy "recipes_select" on recipes for select using (auth.role() = 'authenticated');
create policy "recipes_write" on recipes for all using (is_admin()) with check (is_admin());

create policy "recipe_ingredients_select" on recipe_ingredients for select using (auth.role() = 'authenticated');
create policy "recipe_ingredients_write" on recipe_ingredients for all using (is_admin()) with check (is_admin());

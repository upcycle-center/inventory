-- Target pour-cost % moves from a flat app-wide 20% to a per-recipe,
-- editable value (still defaults to 20) -- lets a recipe be priced with
-- a tighter or looser margin without changing the math for every recipe.
alter table recipes add column if not exists target_pour_cost_pct numeric(5, 2) not null default 20;

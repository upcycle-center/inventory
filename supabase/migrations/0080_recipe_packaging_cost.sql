-- Small fixed cost to cover the cup itself and ice, added on top of
-- ingredient cost when computing a recipe's Cost & MSRP. One flat $0.50
-- amount shared by every Serving size (cup+ice cost doesn't depend on
-- which recipe it is), editable from a single settings field.
create table if not exists recipe_serving_packaging_costs (
  size recipe_request_size primary key,
  cost numeric(6, 2) not null default 0.50,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

insert into recipe_serving_packaging_costs (size, cost)
values ('wine', 0.50), ('single', 0.50), ('double', 0.50), ('liter', 0.50), ('batch_2_5_gal', 0.50)
on conflict (size) do update set cost = excluded.cost;

alter table recipe_serving_packaging_costs enable row level security;

create policy "recipe_serving_packaging_costs_select" on recipe_serving_packaging_costs for select using (auth.role() = 'authenticated');
create policy "recipe_serving_packaging_costs_write" on recipe_serving_packaging_costs for all using (is_admin()) with check (is_admin());

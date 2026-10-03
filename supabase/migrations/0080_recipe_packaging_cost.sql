-- Small fixed cost per Serving to cover the cup itself and ice, added on
-- top of ingredient cost when computing a recipe's Cost & MSRP. One
-- global amount per Serving size (cup+ice cost doesn't depend on which
-- recipe it is) rather than a per-recipe field -- admin-editable,
-- defaults to 0 so it's a no-op until filled in.
create table if not exists recipe_serving_packaging_costs (
  size recipe_request_size primary key,
  cost numeric(6, 2) not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

insert into recipe_serving_packaging_costs (size)
values ('wine'), ('single'), ('double'), ('liter'), ('batch_2_5_gal')
on conflict (size) do nothing;

alter table recipe_serving_packaging_costs enable row level security;

create policy "recipe_serving_packaging_costs_select" on recipe_serving_packaging_costs for select using (auth.role() = 'authenticated');
create policy "recipe_serving_packaging_costs_write" on recipe_serving_packaging_costs for all using (is_admin()) with check (is_admin());

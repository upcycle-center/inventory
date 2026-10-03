-- How-to-make-it prep steps, shown on the recipe's downloadable Ops Sheet
-- alongside its ingredients/pick list.
alter table recipes add column if not exists instructions text;

-- Recipe Requests: a location orders a batch of a Recipe at a chosen
-- size (Single/Double/1L Carafe/2.5gal Bubbler) instead of individual
-- products. Stays a recipe-shaped line in the RequestQ queue -- the
-- scaled ingredient pick list is computed in the app from the recipe's
-- own ingredients, not stored here.
create type recipe_request_size as enum ('single', 'double', 'liter', 'batch_2_5_gal');
create type recipe_request_status as enum ('pending', 'fulfilled', 'canceled');

create table if not exists recipe_requests (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id),
  recipe_id uuid not null references recipes(id),
  size recipe_request_size not null,
  quantity int not null default 1,
  note text,
  status recipe_request_status not null default 'pending',
  requested_by uuid references profiles(id),
  requested_at timestamptz not null default now(),
  fulfilled_by uuid references profiles(id),
  fulfilled_at timestamptz
);

alter table recipe_requests enable row level security;

create policy "recipe_requests_select" on recipe_requests for select using (auth.role() = 'authenticated');
create policy "recipe_requests_insert" on recipe_requests for insert with check (auth.role() = 'authenticated');
create policy "recipe_requests_write" on recipe_requests for update using (is_warehouse()) with check (is_warehouse());
create policy "recipe_requests_delete" on recipe_requests for delete using (is_admin());

-- Matches the existing "request" view default -- warehouse/kitchen/
-- catering/ops/stand_lead all get it out of the box (admin always has
-- every view); adjustable per-role in /admin/permissions afterward.
insert into role_view_permissions (role, view_key, allowed) values
  ('warehouse', 'recipe_request', true),
  ('kitchen', 'recipe_request', true),
  ('catering', 'recipe_request', true),
  ('ops', 'recipe_request', true),
  ('stand_lead', 'recipe_request', true)
on conflict (role, view_key) do nothing;

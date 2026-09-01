-- Replaces the free-text profiles.certifications tag list with dated,
-- checkbox-driven records: an admin-managed certification_types picklist
-- (Certified Alcohol, Certified Food, ...) and a user_certifications table
-- carrying certified_at/expires_at per user per type, so the Users screen
-- can show a green/orange compliance badge instead of a text field. Also
-- adds a phone/contact number to profiles and lets admin edit any user's
-- name/phone/role from a per-user detail page.

create table certification_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table user_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  certification_type_id uuid not null references certification_types (id) on delete cascade,
  certified_at date,
  expires_at date,
  created_at timestamptz not null default now(),
  unique (user_id, certification_type_id)
);

create index on user_certifications (user_id);

alter table profiles add column phone text;

-- Seed with the types already in use as free text, so existing test data
-- (Concession Test User's "Certified Bartender") carries forward.
insert into certification_types (name, sort_order) values
  ('Certified Alcohol', 0),
  ('Certified Food', 1),
  ('Certified Bartender', 2);

insert into user_certifications (user_id, certification_type_id)
select p.id, ct.id
from profiles p
cross join lateral unnest(p.certifications) as tag(name)
join certification_types ct on ct.name = tag.name
on conflict (user_id, certification_type_id) do nothing;

alter table profiles drop column certifications;

alter table certification_types enable row level security;
alter table user_certifications enable row level security;

create policy "certification_types_select_all" on certification_types for select using (auth.role() = 'authenticated');
create policy "certification_types_admin_write" on certification_types for all using (is_admin()) with check (is_admin());

create policy "user_certifications_select_all" on user_certifications for select using (auth.role() = 'authenticated');
create policy "user_certifications_admin_write" on user_certifications for all using (is_admin()) with check (is_admin());

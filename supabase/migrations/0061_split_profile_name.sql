-- Splits profiles.name into first_name/last_name to match the Roster
-- roster's schema, so the Users add/edit forms and list can show the same
-- First Name / Last Name fields Roster does. `name` becomes a generated
-- column (first_name || ' ' || last_name) so every existing join/select
-- across the app that reads `name` keeps working completely unchanged.

alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;

update profiles
set
  first_name = case when position(' ' in name) > 0 then split_part(name, ' ', 1) else name end,
  last_name = case when position(' ' in name) > 0 then trim(substring(name from position(' ' in name) + 1)) else '' end
where first_name is null;

update profiles set first_name = '' where first_name is null;
update profiles set last_name = '' where last_name is null;

alter table profiles alter column first_name set default '';
alter table profiles alter column last_name set default '';
alter table profiles alter column first_name set not null;
alter table profiles alter column last_name set not null;

alter table profiles drop column name;
alter table profiles add column name text generated always as (trim(both ' ' from (first_name || ' ' || last_name))) stored;

-- The auto-create-on-signup trigger inserted `name` directly -- now that
-- it's generated, insert first_name/last_name instead.
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, first_name, last_name, email, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', new.email),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    lower(split_part(new.email, '@', 1)),
    'stand_lead'
  );
  return new;
end;
$$;

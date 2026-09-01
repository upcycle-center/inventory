-- profiles.username is now not-null, so the auto-create-on-signup trigger
-- needs to set one too (defaulting to the email's local part, same as
-- the backfill in 0026) — inviteUser then overwrites it with the admin-
-- chosen username right after creation.
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    lower(split_part(new.email, '@', 1)),
    'stand_lead'
  );
  return new;
end;
$$;

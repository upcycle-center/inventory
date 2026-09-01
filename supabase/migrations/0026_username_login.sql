-- Users sign in with a username instead of their email; email is kept
-- purely for notifications (restock requests, count confirmations, etc).
-- The username -> email lookup happens server-side with the service role
-- (see /api/auth/resolve-username) before the real Supabase Auth
-- sign-in call, so this column doesn't need to be publicly readable.
alter table profiles add column username text;

-- Backfill from the local part of each existing email, deduping any
-- collisions with a numeric suffix.
with base as (
  select id, lower(split_part(email, '@', 1)) as base_username,
         row_number() over (partition by lower(split_part(email, '@', 1)) order by created_at) as rn
  from profiles
)
update profiles p
set username = case when b.rn = 1 then b.base_username else b.base_username || b.rn::text end
from base b
where p.id = b.id;

alter table profiles alter column username set not null;
create unique index profiles_username_unique_idx on profiles (lower(username));

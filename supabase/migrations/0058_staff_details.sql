-- Fleshes out the Staff roster with real contact/role info instead of
-- just a bare name. Written idempotently (if not exists / if exists
-- guards throughout) so it converges to the same schema whether or not
-- migration 0057 was already run.
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table staff add column if not exists first_name text not null default '';
alter table staff add column if not exists last_name text not null default '';
alter table staff add column if not exists main_role text;
alter table staff add column if not exists cover_role text;
alter table staff add column if not exists phone text;
alter table staff add column if not exists email text;
alter table staff add column if not exists certified boolean not null default false;
-- Bartender requires T.E.A.M certification (alcohol service); Server Food
-- requires ServeSafe -- enforced app-side as an informational warning,
-- not a hard block, since a single certified/expires pair covers
-- whichever certification a person's Main Role actually needs.
alter table staff add column if not exists certification_expires_at date;
alter table staff add column if not exists ready_to_work boolean not null default false;

-- The old free-text single "name" column (from 0057) is superseded by
-- first_name/last_name -- a no-op if 0057 was never run.
alter table staff drop column if exists name;

alter table staff enable row level security;

drop policy if exists "staff_select_all" on staff;
create policy "staff_select_all" on staff for select using (auth.role() = 'authenticated');

drop policy if exists "staff_admin_write" on staff;
create policy "staff_admin_write" on staff for all using (is_admin()) with check (is_admin());

alter table shift_call_outs add column if not exists staff_id uuid references staff (id) on delete set null;
alter table event_locations add column if not exists pending_unlock_staff_id uuid references staff (id) on delete set null;

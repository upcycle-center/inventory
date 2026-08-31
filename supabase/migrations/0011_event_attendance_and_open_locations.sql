-- Event-level headcount fields, and a per-event Open/Closed flag for each
-- location so admins can mark which concessions/kitchens are running a
-- given show independently of who's assigned to lead them.

alter table events add column attendance integer;
alter table events add column team_size integer;

create table event_locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  is_open boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (event_id, location_id)
);

alter table event_locations enable row level security;

create policy "event_locations_select_all" on event_locations for select using (auth.role() = 'authenticated');
create policy "event_locations_admin_write" on event_locations for all using (is_admin()) with check (is_admin());

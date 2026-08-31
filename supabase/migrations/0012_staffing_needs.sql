-- Base staffing needs per location, admin-defined attendance tiers that
-- override a role's count for smaller/larger shows, and a certifications
-- tag list on profiles so a role slot can be auto-covered by a certified
-- Location Lead (e.g. a Certified Bartender Stand Lead covers the
-- Bartender slot without a separate hire).

alter table profiles add column certifications text[] not null default '{}';

create table location_staff_roles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  role_name text not null,
  base_count integer not null default 0,
  required_certification text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (location_id, role_name)
);

-- Admin-defined count override for a role at a given attendance range.
-- max_attendance null = unbounded ("3000 and up"). Ranges are inclusive
-- of min_attendance, exclusive of max_attendance.
create table location_staff_tiers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  role_name text not null,
  min_attendance integer not null default 0,
  max_attendance integer,
  count integer not null,
  created_at timestamptz not null default now(),
  constraint location_staff_tiers_range_valid check (max_attendance is null or max_attendance > min_attendance)
);

create index on location_staff_roles (location_id);
create index on location_staff_tiers (location_id, role_name);

alter table location_staff_roles enable row level security;
alter table location_staff_tiers enable row level security;

create policy "location_staff_roles_select_all" on location_staff_roles for select using (auth.role() = 'authenticated');
create policy "location_staff_roles_admin_write" on location_staff_roles for all using (is_admin()) with check (is_admin());

create policy "location_staff_tiers_select_all" on location_staff_tiers for select using (auth.role() = 'authenticated');
create policy "location_staff_tiers_admin_write" on location_staff_tiers for all using (is_admin()) with check (is_admin());

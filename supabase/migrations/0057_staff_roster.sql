-- A roster of staff who work stands but aren't necessarily system users
-- (no login, no profiles row) -- just a name plus certification/
-- readiness status, so the Call-Out/No-Show picker on an event's page
-- has someone to attribute an absence to, and trends can be tracked by
-- staff member, not just role/location/event.
create table staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  certified boolean not null default false,
  ready_to_work boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table staff enable row level security;

create policy "staff_select_all" on staff for select using (auth.role() = 'authenticated');
create policy "staff_admin_write" on staff for all using (is_admin()) with check (is_admin());

-- Which staff member a logged Call-Out/No-Show is attributed to (optional
-- -- a Manager may log one without knowing/picking a specific person).
alter table shift_call_outs add column staff_id uuid references staff (id) on delete set null;

-- Carries the staff member picked at Unlock time through to the next
-- Confirm, same as pending_unlock_reason.
alter table event_locations add column pending_unlock_staff_id uuid references staff (id) on delete set null;

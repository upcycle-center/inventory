-- Lets admin lock in a location's Lead assignment + recommended staff count
-- for an event, so the row can't be changed by accident. Unlocking clears
-- the confirmed flag but keeps the last confirmed_staff_count as a record.

alter table event_locations add column confirmed boolean not null default false;
alter table event_locations add column confirmed_staff_count integer;
alter table event_locations add column confirmed_at timestamptz;
alter table event_locations add column confirmed_by uuid references profiles (id) on delete set null;

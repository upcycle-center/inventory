-- A location can also have a Backup Lead -- someone who can actually run
-- the stand (open counts, submit them) for ANY event at this location,
-- not just a reference name like default_lead_user_id. Widen
-- is_assigned_to_stand so the backup lead's access matches the assigned
-- event lead's everywhere that function gates RLS (location_counts,
-- location_count_lines, waste_records, comp_records).

alter table locations add column backup_lead_user_id uuid references profiles (id) on delete set null;

create or replace function is_assigned_to_stand(check_event_id uuid, check_location_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from event_location_assignments
    where event_id = check_event_id
      and location_id = check_location_id
      and location_lead_user_id = auth.uid()
  ) or exists (
    select 1 from locations
    where id = check_location_id
      and backup_lead_user_id = auth.uid()
  );
$$;

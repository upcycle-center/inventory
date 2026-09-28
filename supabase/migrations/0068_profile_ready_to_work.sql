-- System Users (Warehouse/Stand Lead/Kitchen/Catering -- not Admin/Ops,
-- which don't go through the onboarding pipeline) get the same
-- ready_to_work gate Roster/Staff already has, so the annual season
-- reset and the Orientation/Certification/Cleared Status badge can apply
-- to them too. New rows default to false (same as Staff) so a freshly
-- invited user starts at Orientation; existing accounts are backfilled
-- to true since they're already working today.
alter table profiles add column if not exists ready_to_work boolean not null default false;
update profiles set ready_to_work = true;

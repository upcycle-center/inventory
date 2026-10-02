-- Season status for a Location: "open" (currently running, included in
-- bulk Count Sheet generation) vs "closed" (seasonal location shut down
-- for now, skipped by the all-locations Blank Count Sheet). Distinct
-- from `active`, which controls whether the location appears at all in
-- selectors -- a closed-for-the-season location stays active/configured,
-- it just shouldn't print on this round's packet.
alter table locations add column if not exists status text not null default 'open' check (status in ('open', 'closed'));
alter table locations add column if not exists status_updated_at timestamptz;
alter table locations add column if not exists status_updated_by uuid references profiles(id);

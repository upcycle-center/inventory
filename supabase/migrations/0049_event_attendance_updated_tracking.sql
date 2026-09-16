-- Ticket counts (EST and TOT) change fast and get updated by whoever has
-- the latest number, day-of. Track who/when last touched either one so the
-- Event Details page can show a single "Last updated by X on Y" line that
-- staffing decisions can trust -- separate from tot_tickets_posted_at,
-- which keeps its own meaning ("has TOT actually been posted yet").
alter table events add column attendance_updated_at timestamptz;
alter table events add column attendance_updated_by uuid references profiles (id) on delete set null;

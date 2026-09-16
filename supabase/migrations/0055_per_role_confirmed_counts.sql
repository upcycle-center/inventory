-- The WFM Shifts table's role columns (Bar/Buffet/In-Seat/Food/Runner) are
-- now editable, pre-filled with the suggested headcount, before Confirm --
-- confirmed_staff_count alone can't hold that breakdown, so it's stored
-- per role here. pending_unlock_reason carries why a confirmed shift was
-- unlocked (Call-Out/No-Show/other adjustment) through to the next
-- Confirm, where it's used to auto-log which role's count actually came
-- down -- no separate "which role" picker needed.
alter table event_locations add column confirmed_role_counts jsonb;
alter table event_locations add column pending_unlock_reason text
  check (pending_unlock_reason is null or pending_unlock_reason in ('call_out', 'no_show', 'other'));

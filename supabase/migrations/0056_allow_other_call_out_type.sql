-- Adjustments (Unlock reason "other") now get logged to shift_call_outs
-- too, alongside real Call-Outs/No-Shows, so the log can track every
-- staffing change on a confirmed shift, not just the two absence reasons.
alter table shift_call_outs drop constraint if exists shift_call_outs_call_out_type_check;
alter table shift_call_outs add constraint shift_call_outs_call_out_type_check
  check (call_out_type in ('call_out', 'no_show', 'other'));

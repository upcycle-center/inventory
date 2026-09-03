-- Free-text notes a Lead can leave when submitting an opening/closing
-- count -- things to flag for the next shift, context on a discrepancy, etc.
alter table location_counts add column notes text;

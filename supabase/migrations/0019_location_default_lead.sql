-- A location can have a default Location Lead (independent of any specific
-- event). The Event Details page's per-event Lead dropdown pre-fills from
-- this when no event-specific assignment has been made yet, so admin isn't
-- re-picking the same person for every show.

alter table locations add column default_lead_user_id uuid references profiles (id) on delete set null;

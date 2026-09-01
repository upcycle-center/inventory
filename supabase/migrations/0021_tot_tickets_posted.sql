-- TOT Tickets becomes a deliberate "post" action, distinct from saving EST
-- Tickets: once posted it's the actual final attendance reported day-of,
-- and having a posted_at/posted_by lets the Event Detail page compare it
-- against EST-driven staffing recommendations to flag over/under staffing.
alter table events add column tot_tickets_posted_at timestamptz;
alter table events add column tot_tickets_posted_by uuid references profiles (id) on delete set null;

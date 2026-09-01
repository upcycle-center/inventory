-- Attendance splits into two numbers: EST Tickets (an estimate from the
-- latest ticket sales, used to project staffing needs ahead of the show)
-- and TOT Tickets (the actual final count reported to the Stands day-of).
-- The existing attendance column becomes est_tickets (it was already
-- driving the staffing tier math, so this preserves that behavior and any
-- data already entered); tot_tickets is new.

alter table events rename column attendance to est_tickets;
alter table events add column tot_tickets integer;

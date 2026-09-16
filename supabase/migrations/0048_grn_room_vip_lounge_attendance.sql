-- Two more reference attendance numbers alongside EST/TOT Tickets, to help
-- plan staffing for these specific areas. Single figure each (no EST/TOT
-- split), recorded on the event, not tied into the staffing tier math.
alter table events add column grn_room_attendance integer;
alter table events add column vip_lounge_attendance integer;

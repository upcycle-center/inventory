-- Kitchen and Catering are manager roles, not per-event Stand Lead
-- assignments: they get the same unrestricted, no-assignment-needed access
-- as Warehouse (not scoped to their own location type). Also adds
-- "catering" as its own location type — Catering isn't a Stand.

alter type user_role add value 'kitchen';
alter type user_role add value 'catering';
alter type location_type add value 'catering';

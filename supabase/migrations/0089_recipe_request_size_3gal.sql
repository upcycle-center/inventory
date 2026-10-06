-- Replace the 2.5gal/5gal Bubbler sizes with a single 3gal Bubbler.
-- 0088 added 'batch_5_gal' -- it's no longer referenced by the app and
-- is left in place (Postgres can't drop an enum value without
-- recreating the type), while the existing 'batch_2_5_gal' value is
-- renamed in place so any recipe_requests rows keep their data.
alter type recipe_request_size rename value 'batch_2_5_gal' to 'batch_3_gal';

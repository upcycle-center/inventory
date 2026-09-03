-- RECOVERY: a location returning stock to a warehouse location, distinct
-- from a general TRANSFER so it can be reported on separately (count and
-- $ value) -- the month/quarter/year-end process of pulling stock back
-- from stands that are closing for the season.
alter type movement_type add value 'recovery';

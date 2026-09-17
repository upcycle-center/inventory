-- A certification type can now declare how long it stays valid
-- (validity_months) so a roster member's expiration date can be
-- calculated from their issue date instead of entered by hand. ServeSafe
-- is good for 3 years (36 months); other types default to no known
-- duration (manual expiration entry keeps working as before).

alter table certification_types add column if not exists validity_months integer;
alter table staff add column if not exists certified_at date;

update certification_types set validity_months = 36 where name = 'ServeSafe' and validity_months is null;

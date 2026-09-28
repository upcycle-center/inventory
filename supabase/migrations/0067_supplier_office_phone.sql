-- A company-level main line, distinct from either contact's personal
-- mobile number -- paired with Website as a company-details set.
alter table suppliers add column if not exists office_phone text;

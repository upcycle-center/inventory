-- Suppliers grow the same shape of contact information Users/Staff
-- already have (a named contact with phone/email), plus the additional
-- business details a real vendor relationship needs: an account number,
-- a separate billing contact, a delivery schedule, and free-form
-- logistics notes. The old contact_* columns become representative_* to
-- make room for a distinct billing contact alongside it.
alter table suppliers rename column contact_name to representative_name;
alter table suppliers rename column contact_phone to representative_phone;
alter table suppliers rename column contact_email to representative_email;

alter table suppliers
  add column if not exists account_number text,
  add column if not exists website text,
  add column if not exists billing_name text,
  add column if not exists billing_phone text,
  add column if not exists billing_email text,
  add column if not exists delivery_schedule text,
  add column if not exists logistics_notes text;

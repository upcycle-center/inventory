-- Split each supplier contact's single name field into first/last, same
-- as profiles/staff -- Representative and Billing Contact Person both
-- get their own first/last pair.
alter table suppliers rename column representative_name to representative_first_name;
alter table suppliers add column if not exists representative_last_name text;

alter table suppliers rename column billing_name to billing_first_name;
alter table suppliers add column if not exists billing_last_name text;

-- Lets a user receive the daily low-stock report at an address other than
-- their login email (e.g. a shared inbox) without changing how they sign in.
alter table profiles add column low_stock_report_email text;

-- Replace the free-text Delivery Schedule with two day-of-week checkbox
-- sets: which day(s) an order needs to go in by, and which day(s) it
-- actually arrives. Any free-text detail belongs in Logistics Notes now.
alter table suppliers drop column if exists delivery_schedule;
alter table suppliers add column if not exists order_by_days text[] not null default '{}';
alter table suppliers add column if not exists delivery_days text[] not null default '{}';

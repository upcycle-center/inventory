-- Suppliers auto-created by a bulk product CSV upload (when the CSV's
-- supplier name doesn't match an existing one) are flagged for review
-- instead of silently created, since a typo'd name would otherwise create
-- an unnoticed duplicate supplier.

alter table suppliers add column if not exists needs_review boolean not null default false;

-- The per-user report-email override is becoming the one general email
-- admins manage — used for restock requests, count confirmations, and
-- other system notifications, not just the low-stock report. The
-- Supabase Auth email (profiles.email) stays purely a login-technical
-- column now that sign-in is username-based; not every user has a real
-- company email to put there.
alter table profiles rename column low_stock_report_email to notification_email;

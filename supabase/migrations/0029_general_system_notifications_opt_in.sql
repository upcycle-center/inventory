-- One opt-in now gates every automated system email (low-stock report,
-- missing-count report, and future ones) rather than a report-specific
-- flag, matching "users assigned to receive system notifications."
alter table profiles rename column receives_low_stock_report to receives_system_notifications;

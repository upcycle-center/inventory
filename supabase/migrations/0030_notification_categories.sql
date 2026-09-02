-- Replaces the single receives_system_notifications flag with granular
-- per-category subscriptions (Receiving, Requests, Transfers, Counts,
-- Dashboard, or All) managed in a Notifications sub-section on the User
-- Detail page.
alter table profiles add column notification_categories text[] not null default '{}';

-- Preserve existing opt-ins: anyone previously subscribed to the one
-- flag gets "all" so they keep receiving everything they did before.
update profiles set notification_categories = array['all'] where receives_system_notifications = true;

alter table profiles drop column receives_system_notifications;

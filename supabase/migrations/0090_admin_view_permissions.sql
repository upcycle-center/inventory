-- Seed role_view_permissions for the admin-section pages newly added to
-- VIEW_KEYS (Catalog, Operations extras, Catering, Reports, Data Maps,
-- Roster) -- every role defaults to NOT allowed, same safe-default
-- pattern as any new view key: an admin must explicitly opt a role in
-- at /admin/permissions. Users/Permissions are intentionally excluded
-- (no view_key exists for them at all).
insert into role_view_permissions (role, view_key, allowed)
select r.role::user_role, k.view_key, false
from (values ('warehouse'), ('kitchen'), ('catering'), ('ops'), ('stand_lead')) as r(role)
cross join (
  values
    ('products'),
    ('suppliers'),
    ('categories'),
    ('recipes'),
    ('purchase_orders'),
    ('admin_events'),
    ('locations'),
    ('storage_areas'),
    ('beo'),
    ('reports_events'),
    ('reports_month_end'),
    ('reports_year_end'),
    ('roster'),
    ('yellow_dog_mapping'),
    ('square_pos_mapping')
) as k(view_key)
on conflict (role, view_key) do nothing;

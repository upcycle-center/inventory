-- Configurable, role-based view access -- an admin-editable matrix
-- (view x role -> allowed) replacing the hardcoded role lists that used
-- to gate middleware/nav access to Count, Request, Transfer, Recovery,
-- Return, Receive, and RequestQ. Admin is intentionally excluded (it
-- always has every view) so the matrix can't lock admins out of their
-- own admin panel.
create table role_view_permissions (
  id uuid primary key default gen_random_uuid(),
  role user_role not null,
  view_key text not null,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (role, view_key)
);

alter table role_view_permissions enable row level security;

-- Every authenticated request needs to read its own role's permissions
-- (checked in middleware), but only admins can change them.
create policy "role_view_permissions_select" on role_view_permissions for select using (
  auth.role() = 'authenticated'
);
create policy "role_view_permissions_write" on role_view_permissions for all using (
  is_admin()
) with check (
  is_admin()
);

-- Seed defaults matching current behavior: warehouse/kitchen/catering/ops
-- keep full operational access, stand_lead is limited to Count, Request,
-- and Transfer only.
insert into role_view_permissions (role, view_key, allowed) values
  ('warehouse', 'count', true),
  ('warehouse', 'request', true),
  ('warehouse', 'transfer', true),
  ('warehouse', 'recovery', true),
  ('warehouse', 'return', true),
  ('warehouse', 'receive', true),
  ('warehouse', 'restock_requests', true),

  ('kitchen', 'count', true),
  ('kitchen', 'request', true),
  ('kitchen', 'transfer', true),
  ('kitchen', 'recovery', true),
  ('kitchen', 'return', true),
  ('kitchen', 'receive', true),
  ('kitchen', 'restock_requests', true),

  ('catering', 'count', true),
  ('catering', 'request', true),
  ('catering', 'transfer', true),
  ('catering', 'recovery', true),
  ('catering', 'return', true),
  ('catering', 'receive', true),
  ('catering', 'restock_requests', true),

  ('ops', 'count', true),
  ('ops', 'request', true),
  ('ops', 'transfer', true),
  ('ops', 'recovery', true),
  ('ops', 'return', true),
  ('ops', 'receive', true),
  ('ops', 'restock_requests', true),

  ('stand_lead', 'count', true),
  ('stand_lead', 'request', true),
  ('stand_lead', 'transfer', true),
  ('stand_lead', 'recovery', false),
  ('stand_lead', 'return', false),
  ('stand_lead', 'receive', false),
  ('stand_lead', 'restock_requests', false);

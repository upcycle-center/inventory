-- Real per-role call-out/no-show tracking for a confirmed stand team.
-- Previously "call-outs" was only a derived proxy (confirmed headcount
-- undershooting the recommendation) with no record of which role or who
-- reported it. Logged same-day by whoever is running the stand or a
-- manager, so trends (which role calls out most) and staffing gaps can
-- actually be tracked instead of inferred after the fact.
create table shift_call_outs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  role_name text not null,
  call_out_type text not null check (call_out_type in ('call_out', 'no_show')),
  note text,
  reported_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on shift_call_outs (event_id, location_id);
create index on shift_call_outs (role_name);

alter table shift_call_outs enable row level security;

create policy "shift_call_outs_select_all" on shift_call_outs for select using (auth.role() = 'authenticated');

-- Same access as Transfer/Recovery movements (migration 0039): a manager
-- (admin/warehouse/kitchen/catering), or the stand_lead actually running
-- that location right now.
create policy "shift_call_outs_write" on shift_call_outs for all using (
  is_warehouse() or (current_user_role() = 'stand_lead' and is_stand_lead_for_location(location_id))
) with check (
  is_warehouse() or (current_user_role() = 'stand_lead' and is_stand_lead_for_location(location_id))
);

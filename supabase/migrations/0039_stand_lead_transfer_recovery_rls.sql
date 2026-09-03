-- Stand leads can now reach /transfer, /request, and /recovery (from the
-- checkin confirmation screen after closing their own stand), but the
-- underlying tables' write policies only ever allowed is_warehouse()
-- (admin/warehouse/kitchen/catering). Add a narrow additional path: a
-- stand_lead may write here for a location they actually lead -- the
-- assigned lead for a currently-open event there, or its backup lead.
create or replace function is_stand_lead_for_location(check_location_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from locations where id = check_location_id and backup_lead_user_id = auth.uid()
  ) or exists (
    select 1
    from event_location_assignments ela
    join events e on e.id = ela.event_id
    where ela.location_id = check_location_id
      and ela.location_lead_user_id = auth.uid()
      and e.status = 'open'
  );
$$;

drop policy if exists "movements_write" on inventory_movements;
create policy "movements_write" on inventory_movements for all using (
  is_warehouse() or (
    current_user_role() = 'stand_lead'
    and type in ('transfer', 'recovery')
    and from_location_id is not null
    and is_stand_lead_for_location(from_location_id)
  )
) with check (
  is_warehouse() or (
    current_user_role() = 'stand_lead'
    and type in ('transfer', 'recovery')
    and from_location_id is not null
    and is_stand_lead_for_location(from_location_id)
    and user_id = auth.uid()
  )
);

drop policy if exists "thresholds_write" on inventory_thresholds;
create policy "thresholds_write" on inventory_thresholds for all using (
  is_warehouse() or (current_user_role() = 'stand_lead' and is_stand_lead_for_location(location_id))
) with check (
  is_warehouse() or (current_user_role() = 'stand_lead' and is_stand_lead_for_location(location_id))
);

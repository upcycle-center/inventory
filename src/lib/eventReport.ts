import type { SupabaseClient } from "@supabase/supabase-js";
import type { Location, LocationStaffRole, LocationStaffTier } from "./supabase/types";
import { totalRecommendedStaff } from "./staffing";

export interface EventReportRow {
  id: string;
  name: string;
  eventDate: string;
  status: string;
  totTickets: number | null;
  totTicketsPosted: boolean;
  grnRoomAttendance: number | null;
  vipLoungeAttendance: number | null;
  standsOpen: number;
  wfmShifts: number;
}

export type EventStatusFilter = "all" | "upcoming" | "open" | "closed";

// One row per event -- Reports > Events -- covering every event on record
// (most recent first), optionally narrowed to one status. Surfaces the
// query error instead of silently returning an empty report, since an
// empty report and "the query actually failed" otherwise look identical
// on the page.
export async function buildEventReport(
  supabase: SupabaseClient,
  statusFilter: EventStatusFilter = "all",
  limit = 200
): Promise<{ rows: EventReportRow[]; error: string | null }> {
  let query = supabase
    .from("events")
    .select("id, name, event_date, status, est_tickets, tot_tickets, tot_tickets_posted_at, grn_room_attendance, vip_lounge_attendance")
    .order("event_date", { ascending: false })
    .limit(limit);
  if (statusFilter !== "all") query = query.eq("status", statusFilter);

  const { data: eventsRaw, error } = await query;
  if (error) return { rows: [], error: error.message };

  const events =
    (eventsRaw as
      | {
          id: string;
          name: string;
          event_date: string;
          status: string;
          est_tickets: number | null;
          tot_tickets: number | null;
          tot_tickets_posted_at: string | null;
          grn_room_attendance: number | null;
          vip_lounge_attendance: number | null;
        }[]
      | null) ?? [];
  if (!events.length) return { rows: [], error: null };

  const eventIds = events.map((e) => e.id);

  const { data: standLocationsRaw } = await supabase.from("locations").select("*").eq("active", true).eq("type", "stand");
  const standLocations = (standLocationsRaw as Location[] | null) ?? [];
  const standLocationIds = standLocations.map((l) => l.id);

  const [{ data: staffRolesRaw }, { data: staffTiersRaw }, { data: eventLocationsRaw }] = await Promise.all([
    standLocationIds.length
      ? supabase.from("location_staff_roles").select("*").in("location_id", standLocationIds)
      : Promise.resolve({ data: [] as LocationStaffRole[] }),
    standLocationIds.length
      ? supabase.from("location_staff_tiers").select("*").in("location_id", standLocationIds)
      : Promise.resolve({ data: [] as LocationStaffTier[] }),
    supabase.from("event_locations").select("event_id, location_id, is_open").in("event_id", eventIds),
  ]);

  const rolesByLocationId = new Map<string, LocationStaffRole[]>();
  for (const role of (staffRolesRaw as LocationStaffRole[] | null) ?? []) {
    const list = rolesByLocationId.get(role.location_id) ?? [];
    list.push(role);
    rolesByLocationId.set(role.location_id, list);
  }
  const staffTiers = (staffTiersRaw as LocationStaffTier[] | null) ?? [];

  const eventLocationRows =
    (eventLocationsRaw as { event_id: string; location_id: string; is_open: boolean }[] | null) ?? [];
  const rowsByEventId = new Map<string, typeof eventLocationRows>();
  for (const r of eventLocationRows) {
    const list = rowsByEventId.get(r.event_id) ?? [];
    list.push(r);
    rowsByEventId.set(r.event_id, list);
  }

  const rows = events.map((ev) => {
    const evRows = rowsByEventId.get(ev.id) ?? [];
    const openMap = new Map<string, boolean>();
    let standsOpen = 0;
    for (const r of evRows) {
      openMap.set(r.location_id, r.is_open);
      if (r.is_open) standsOpen += 1;
    }
    const wfmShifts = totalRecommendedStaff(standLocationIds, openMap, rolesByLocationId, staffTiers, ev.est_tickets);

    return {
      id: ev.id,
      name: ev.name,
      eventDate: ev.event_date,
      status: ev.status,
      totTickets: ev.tot_tickets,
      totTicketsPosted: !!ev.tot_tickets_posted_at,
      grnRoomAttendance: ev.grn_room_attendance,
      vipLoungeAttendance: ev.vip_lounge_attendance,
      standsOpen,
      wfmShifts,
    };
  });

  return { rows, error: null };
}

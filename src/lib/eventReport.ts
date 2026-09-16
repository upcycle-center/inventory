import type { SupabaseClient } from "@supabase/supabase-js";
import type { Location, LocationStaffRole, LocationStaffTier } from "./supabase/types";
import { totalRecommendedStaff } from "./staffing";

export interface EventReportRow {
  id: string;
  name: string;
  eventDate: string;
  status: string;
  estTickets: number | null;
  totTickets: number | null;
  totTicketsPosted: boolean;
  recommendedShifts: number;
  confirmedShifts: number;
  locationsOpen: number;
  locationsConfirmed: number;
  countSheetsExpected: number;
  countSheetsSubmitted: number;
}

// One row per event with the same staffing/count-sheet-completion math the
// Dashboard rolls up across just "upcoming/open" events -- Reports > Events
// keeps it at per-event detail and covers every event on record (most
// recent first), not only the currently active ones.
export async function buildEventReport(supabase: SupabaseClient, limit = 200): Promise<EventReportRow[]> {
  const { data: eventsRaw } = await supabase
    .from("events")
    .select("id, name, event_date, est_tickets, tot_tickets, tot_tickets_posted_at, status")
    .order("event_date", { ascending: false })
    .limit(limit);
  const events =
    (eventsRaw as
      | {
          id: string;
          name: string;
          event_date: string;
          est_tickets: number | null;
          tot_tickets: number | null;
          tot_tickets_posted_at: string | null;
          status: string;
        }[]
      | null) ?? [];
  if (!events.length) return [];

  const eventIds = events.map((e) => e.id);

  const { data: standLocationsRaw } = await supabase.from("locations").select("*").eq("active", true).eq("type", "stand");
  const standLocations = (standLocationsRaw as Location[] | null) ?? [];
  const standLocationIds = standLocations.map((l) => l.id);

  const [{ data: staffRolesRaw }, { data: staffTiersRaw }, { data: eventLocationsRaw }, { data: closingCountsRaw }] = await Promise.all([
    standLocationIds.length
      ? supabase.from("location_staff_roles").select("*").in("location_id", standLocationIds)
      : Promise.resolve({ data: [] as LocationStaffRole[] }),
    standLocationIds.length
      ? supabase.from("location_staff_tiers").select("*").in("location_id", standLocationIds)
      : Promise.resolve({ data: [] as LocationStaffTier[] }),
    supabase.from("event_locations").select("event_id, location_id, is_open, confirmed, confirmed_staff_count").in("event_id", eventIds),
    supabase.from("location_counts").select("event_id, location_id").in("event_id", eventIds).eq("type", "closing"),
  ]);

  const rolesByLocationId = new Map<string, LocationStaffRole[]>();
  for (const role of (staffRolesRaw as LocationStaffRole[] | null) ?? []) {
    const list = rolesByLocationId.get(role.location_id) ?? [];
    list.push(role);
    rolesByLocationId.set(role.location_id, list);
  }
  const staffTiers = (staffTiersRaw as LocationStaffTier[] | null) ?? [];

  const eventLocationRows =
    (eventLocationsRaw as
      | { event_id: string; location_id: string; is_open: boolean; confirmed: boolean; confirmed_staff_count: number | null }[]
      | null) ?? [];
  const submittedKeys = new Set(
    ((closingCountsRaw as { event_id: string; location_id: string }[] | null) ?? []).map((c) => `${c.event_id}:${c.location_id}`)
  );

  const rowsByEventId = new Map<string, typeof eventLocationRows>();
  for (const r of eventLocationRows) {
    const list = rowsByEventId.get(r.event_id) ?? [];
    list.push(r);
    rowsByEventId.set(r.event_id, list);
  }

  return events.map((ev) => {
    const rows = rowsByEventId.get(ev.id) ?? [];
    const openMap = new Map<string, boolean>();
    const confirmedMap = new Map<string, boolean>();
    let locationsOpen = 0;
    let locationsConfirmed = 0;
    let countSheetsExpected = 0;
    let countSheetsSubmitted = 0;
    for (const r of rows) {
      openMap.set(r.location_id, r.is_open);
      confirmedMap.set(r.location_id, r.is_open && r.confirmed);
      if (r.is_open) locationsOpen += 1;
      if (r.is_open && r.confirmed) {
        locationsConfirmed += 1;
        countSheetsExpected += 1;
        if (submittedKeys.has(`${ev.id}:${r.location_id}`)) countSheetsSubmitted += 1;
      }
    }
    const recommendedShifts = totalRecommendedStaff(standLocationIds, openMap, rolesByLocationId, staffTiers, ev.est_tickets);
    const confirmedShifts = totalRecommendedStaff(standLocationIds, confirmedMap, rolesByLocationId, staffTiers, ev.est_tickets);

    return {
      id: ev.id,
      name: ev.name,
      eventDate: ev.event_date,
      status: ev.status,
      estTickets: ev.est_tickets,
      totTickets: ev.tot_tickets,
      totTicketsPosted: !!ev.tot_tickets_posted_at,
      recommendedShifts,
      confirmedShifts,
      locationsOpen,
      locationsConfirmed,
      countSheetsExpected,
      countSheetsSubmitted,
    };
  });
}

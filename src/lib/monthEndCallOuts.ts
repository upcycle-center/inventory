import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationStaffRole, LocationStaffTier } from "./supabase/types";
import { totalRecommendedStaff } from "./staffing";

export interface CallOutEventRow {
  eventId: string;
  eventName: string;
  eventDate: string;
  recommended: number;
  confirmed: number;
  variance: number;
}

export interface CallOutLocationGroup {
  id: string;
  name: string;
  yellow_dog_code: string | null;
  events: CallOutEventRow[];
  avgVariance: number;
  shortStaffedCount: number;
}

// There's no real attendance/call-out record in the schema -- only an
// admin-entered confirmed_staff_count per (event, location) vs. the
// location_staff_roles/tiers-derived recommendation, the same "Avg staff
// variance" figure the Dashboard already shows. This proxies "call-outs"
// as events where confirmed staffing came in under recommended. There's no
// per-role breakdown of confirmed_staff_count, so the drill-down here is
// Location -> event, not Location -> Stand Role.
export async function buildMonthEndCallOutsReport(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<{ locations: CallOutLocationGroup[]; avgVariance: number; shortStaffedCount: number }> {
  const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const monthEndStr = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const { data: standLocationsRaw } = await supabase
    .from("locations")
    .select("id, name, yellow_dog_code")
    .eq("active", true)
    .eq("type", "stand")
    .order("name");
  const standLocations = (standLocationsRaw as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? [];
  const standLocationIds = standLocations.map((l) => l.id);
  if (!standLocationIds.length) return { locations: [], avgVariance: 0, shortStaffedCount: 0 };

  const [{ data: eventsRaw }, { data: staffRolesRaw }, { data: staffTiersRaw }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, event_date, est_tickets")
      .gte("event_date", monthStartStr)
      .lt("event_date", monthEndStr)
      .order("event_date"),
    supabase.from("location_staff_roles").select("*").in("location_id", standLocationIds),
    supabase.from("location_staff_tiers").select("*").in("location_id", standLocationIds),
  ]);

  const events = (eventsRaw as { id: string; name: string; event_date: string; est_tickets: number | null }[] | null) ?? [];
  const eventIds = events.map((e) => e.id);

  const rolesByLocationId = new Map<string, LocationStaffRole[]>();
  for (const role of (staffRolesRaw as LocationStaffRole[] | null) ?? []) {
    const list = rolesByLocationId.get(role.location_id) ?? [];
    list.push(role);
    rolesByLocationId.set(role.location_id, list);
  }
  const staffTiers = (staffTiersRaw as LocationStaffTier[] | null) ?? [];

  const { data: eventLocationsRaw } = eventIds.length
    ? await supabase
        .from("event_locations")
        .select("event_id, location_id, confirmed_staff_count")
        .in("event_id", eventIds)
        .in("location_id", standLocationIds)
        .eq("confirmed", true)
        .not("confirmed_staff_count", "is", null)
    : { data: [] as any[] };

  const eventById = new Map(events.map((e) => [e.id, e]));
  const rowsByLocationId = new Map<string, CallOutEventRow[]>();
  let varianceSum = 0;
  let varianceCount = 0;
  let shortStaffedCount = 0;

  for (const r of (eventLocationsRaw as { event_id: string; location_id: string; confirmed_staff_count: number | null }[] | null) ?? []) {
    const ev = eventById.get(r.event_id);
    if (!ev || r.confirmed_staff_count == null) continue;
    const recommended = totalRecommendedStaff(
      [r.location_id],
      new Map([[r.location_id, true]]),
      rolesByLocationId,
      staffTiers,
      ev.est_tickets
    );
    const variance = r.confirmed_staff_count - recommended;
    varianceSum += variance;
    varianceCount += 1;
    if (variance < 0) shortStaffedCount += 1;
    const list = rowsByLocationId.get(r.location_id) ?? [];
    list.push({ eventId: ev.id, eventName: ev.name, eventDate: ev.event_date, recommended, confirmed: r.confirmed_staff_count, variance });
    rowsByLocationId.set(r.location_id, list);
  }

  const locationGroups: CallOutLocationGroup[] = [];
  for (const loc of standLocations) {
    const events = rowsByLocationId.get(loc.id);
    if (!events || !events.length) continue;
    events.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    const sum = events.reduce((s, e) => s + e.variance, 0);
    const shortCount = events.filter((e) => e.variance < 0).length;
    locationGroups.push({
      id: loc.id,
      name: loc.name,
      yellow_dog_code: loc.yellow_dog_code,
      events,
      avgVariance: sum / events.length,
      shortStaffedCount: shortCount,
    });
  }

  return {
    locations: locationGroups,
    avgVariance: varianceCount ? varianceSum / varianceCount : 0,
    shortStaffedCount,
  };
}

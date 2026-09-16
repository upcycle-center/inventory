import type { SupabaseClient } from "@supabase/supabase-js";

export interface RoleCallOutBreakdown {
  roleName: string;
  callOuts: number;
  noShows: number;
  total: number;
}

export interface LocationCallOutBreakdown {
  locationId: string;
  name: string;
  yellow_dog_code: string | null;
  callOuts: number;
  noShows: number;
  total: number;
}

function monthRange(year: number, month: number) {
  const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const monthEndStr = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { monthStartStr, monthEndStr };
}

async function eventIdsForMonth(supabase: SupabaseClient, year: number, month: number): Promise<string[]> {
  const { monthStartStr, monthEndStr } = monthRange(year, month);
  const { data } = await supabase.from("events").select("id").gte("event_date", monthStartStr).lt("event_date", monthEndStr);
  return ((data as { id: string }[] | null) ?? []).map((e) => e.id);
}

// Real per-role and per-location Call-Out/No-Show trend, logged directly
// on each event's page (not inferred from confirmed headcount vs.
// recommendation -- that proxy is gone now that there's an actual logged
// record). Plain Adjustments are excluded from both breakdowns -- this is
// specifically about real absences.
export async function buildMonthEndCallOutsReport(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<{ roleBreakdown: RoleCallOutBreakdown[]; locationBreakdown: LocationCallOutBreakdown[] }> {
  const { data: standLocationsRaw } = await supabase
    .from("locations")
    .select("id, name, yellow_dog_code")
    .eq("active", true)
    .eq("type", "stand");
  const standLocations = (standLocationsRaw as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? [];
  const standLocationIds = standLocations.map((l) => l.id);
  if (!standLocationIds.length) return { roleBreakdown: [], locationBreakdown: [] };

  const eventIds = await eventIdsForMonth(supabase, year, month);
  if (!eventIds.length) return { roleBreakdown: [], locationBreakdown: [] };

  const { data: callOutsRaw } = await supabase
    .from("shift_call_outs")
    .select("location_id, role_name, call_out_type")
    .in("event_id", eventIds)
    .in("location_id", standLocationIds)
    .in("call_out_type", ["call_out", "no_show"]);
  const callOuts = (callOutsRaw as { location_id: string; role_name: string; call_out_type: string }[] | null) ?? [];

  const roleBreakdownMap = new Map<string, { callOuts: number; noShows: number }>();
  const locationBreakdownMap = new Map<string, { callOuts: number; noShows: number }>();
  for (const c of callOuts) {
    const roleEntry = roleBreakdownMap.get(c.role_name) ?? { callOuts: 0, noShows: 0 };
    const locationEntry = locationBreakdownMap.get(c.location_id) ?? { callOuts: 0, noShows: 0 };
    if (c.call_out_type === "no_show") {
      roleEntry.noShows += 1;
      locationEntry.noShows += 1;
    } else {
      roleEntry.callOuts += 1;
      locationEntry.callOuts += 1;
    }
    roleBreakdownMap.set(c.role_name, roleEntry);
    locationBreakdownMap.set(c.location_id, locationEntry);
  }

  const roleBreakdown: RoleCallOutBreakdown[] = Array.from(roleBreakdownMap.entries())
    .map(([roleName, { callOuts, noShows }]) => ({ roleName, callOuts, noShows, total: callOuts + noShows }))
    .sort((a, b) => b.total - a.total);

  const locationBreakdown: LocationCallOutBreakdown[] = standLocations
    .map((loc) => {
      const { callOuts, noShows } = locationBreakdownMap.get(loc.id) ?? { callOuts: 0, noShows: 0 };
      return { locationId: loc.id, name: loc.name, yellow_dog_code: loc.yellow_dog_code, callOuts, noShows, total: callOuts + noShows };
    })
    .filter((l) => l.total > 0)
    .sort((a, b) => b.total - a.total);

  return { roleBreakdown, locationBreakdown };
}

export interface CallOutLogEntry {
  id: string;
  roleName: string;
  callOutType: "call_out" | "no_show" | "other";
  note: string | null;
  createdAt: string;
  eventName: string;
  eventDate: string;
  reportedByName: string | null;
}

// Every logged entry (Call-Out, No-Show, and Adjustment alike) for one
// location during the given month -- the drill-down behind a location row
// in the summary above.
export async function getLocationCallOutEntries(
  supabase: SupabaseClient,
  year: number,
  month: number,
  locationId: string
): Promise<CallOutLogEntry[]> {
  const eventIds = await eventIdsForMonth(supabase, year, month);
  if (!eventIds.length) return [];

  const { data } = await supabase
    .from("shift_call_outs")
    .select("id, role_name, call_out_type, note, created_at, event:events(name, event_date), reported_by_profile:profiles(name)")
    .eq("location_id", locationId)
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  return ((data as any[] | null) ?? []).map((r) => ({
    id: r.id,
    roleName: r.role_name,
    callOutType: r.call_out_type,
    note: r.note,
    createdAt: r.created_at,
    eventName: r.event?.name ?? "—",
    eventDate: r.event?.event_date ?? "",
    reportedByName: r.reported_by_profile?.name ?? null,
  }));
}

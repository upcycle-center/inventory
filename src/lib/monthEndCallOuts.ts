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

export interface EventCallOutBreakdown {
  eventId: string;
  eventName: string;
  eventDate: string;
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

async function eventsForMonth(supabase: SupabaseClient, year: number, month: number) {
  const { monthStartStr, monthEndStr } = monthRange(year, month);
  const { data } = await supabase
    .from("events")
    .select("id, name, event_date")
    .gte("event_date", monthStartStr)
    .lt("event_date", monthEndStr)
    .order("event_date");
  return (data as { id: string; name: string; event_date: string }[] | null) ?? [];
}

// Real per-role, per-location, and per-event Call-Out/No-Show trend,
// logged directly on each event's page (not inferred from confirmed
// headcount vs. recommendation -- that proxy is gone now that there's an
// actual logged record). Plain Adjustments are excluded from all three
// breakdowns -- this is specifically about real absences.
export async function buildMonthEndCallOutsReport(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<{
  roleBreakdown: RoleCallOutBreakdown[];
  locationBreakdown: LocationCallOutBreakdown[];
  eventBreakdown: EventCallOutBreakdown[];
}> {
  const { data: standLocationsRaw } = await supabase
    .from("locations")
    .select("id, name, yellow_dog_code")
    .eq("active", true)
    .eq("type", "stand");
  const standLocations = (standLocationsRaw as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? [];
  const standLocationIds = standLocations.map((l) => l.id);
  if (!standLocationIds.length) return { roleBreakdown: [], locationBreakdown: [], eventBreakdown: [] };

  const events = await eventsForMonth(supabase, year, month);
  const eventIds = events.map((e) => e.id);
  if (!eventIds.length) return { roleBreakdown: [], locationBreakdown: [], eventBreakdown: [] };

  const { data: callOutsRaw } = await supabase
    .from("shift_call_outs")
    .select("event_id, location_id, role_name, call_out_type")
    .in("event_id", eventIds)
    .in("location_id", standLocationIds)
    .in("call_out_type", ["call_out", "no_show"]);
  const callOuts = (callOutsRaw as { event_id: string; location_id: string; role_name: string; call_out_type: string }[] | null) ?? [];

  const roleBreakdownMap = new Map<string, { callOuts: number; noShows: number }>();
  const locationBreakdownMap = new Map<string, { callOuts: number; noShows: number }>();
  const eventBreakdownMap = new Map<string, { callOuts: number; noShows: number }>();
  for (const c of callOuts) {
    const roleEntry = roleBreakdownMap.get(c.role_name) ?? { callOuts: 0, noShows: 0 };
    const locationEntry = locationBreakdownMap.get(c.location_id) ?? { callOuts: 0, noShows: 0 };
    const eventEntry = eventBreakdownMap.get(c.event_id) ?? { callOuts: 0, noShows: 0 };
    if (c.call_out_type === "no_show") {
      roleEntry.noShows += 1;
      locationEntry.noShows += 1;
      eventEntry.noShows += 1;
    } else {
      roleEntry.callOuts += 1;
      locationEntry.callOuts += 1;
      eventEntry.callOuts += 1;
    }
    roleBreakdownMap.set(c.role_name, roleEntry);
    locationBreakdownMap.set(c.location_id, locationEntry);
    eventBreakdownMap.set(c.event_id, eventEntry);
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

  const eventBreakdown: EventCallOutBreakdown[] = events
    .map((ev) => {
      const { callOuts, noShows } = eventBreakdownMap.get(ev.id) ?? { callOuts: 0, noShows: 0 };
      return { eventId: ev.id, eventName: ev.name, eventDate: ev.event_date, callOuts, noShows, total: callOuts + noShows };
    })
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total);

  return { roleBreakdown, locationBreakdown, eventBreakdown };
}

export interface CallOutLogEntry {
  id: string;
  roleName: string;
  callOutType: "call_out" | "no_show" | "other";
  note: string | null;
  createdAt: string;
  locationName: string;
  eventName: string;
  eventDate: string;
  reportedByName: string | null;
}

// Every logged entry (Call-Out, No-Show, and Adjustment alike) for one
// location during the given month -- the drill-down behind a location row
// in the By Location summary above.
export async function getLocationCallOutEntries(
  supabase: SupabaseClient,
  year: number,
  month: number,
  locationId: string
): Promise<CallOutLogEntry[]> {
  const events = await eventsForMonth(supabase, year, month);
  if (!events.length) return [];

  const { data } = await supabase
    .from("shift_call_outs")
    .select("id, role_name, call_out_type, note, created_at, event:events(name, event_date), reported_by_profile:profiles(name)")
    .eq("location_id", locationId)
    .in("event_id", events.map((e) => e.id))
    .order("created_at", { ascending: false });

  return ((data as any[] | null) ?? []).map((r) => ({
    id: r.id,
    roleName: r.role_name,
    callOutType: r.call_out_type,
    note: r.note,
    createdAt: r.created_at,
    locationName: "",
    eventName: r.event?.name ?? "—",
    eventDate: r.event?.event_date ?? "",
    reportedByName: r.reported_by_profile?.name ?? null,
  }));
}

// Every logged entry (Call-Out, No-Show, and Adjustment alike) for one
// event, across every location -- the drill-down behind an event row in
// the By Event summary above.
export async function getEventCallOutEntries(supabase: SupabaseClient, eventId: string): Promise<CallOutLogEntry[]> {
  const { data } = await supabase
    .from("shift_call_outs")
    .select("id, role_name, call_out_type, note, created_at, location:locations(name), reported_by_profile:profiles(name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  return ((data as any[] | null) ?? []).map((r) => ({
    id: r.id,
    roleName: r.role_name,
    callOutType: r.call_out_type,
    note: r.note,
    createdAt: r.created_at,
    locationName: r.location?.name ?? "—",
    eventName: "",
    eventDate: "",
    reportedByName: r.reported_by_profile?.name ?? null,
  }));
}

// Every logged entry (Call-Out, No-Show, and Adjustment alike) for one
// role during the given month, across every location and event -- the
// drill-down behind a role row in the By Role summary above.
export async function getRoleCallOutEntries(
  supabase: SupabaseClient,
  year: number,
  month: number,
  roleName: string
): Promise<CallOutLogEntry[]> {
  const events = await eventsForMonth(supabase, year, month);
  if (!events.length) return [];

  const { data } = await supabase
    .from("shift_call_outs")
    .select(
      "id, role_name, call_out_type, note, created_at, location:locations(name), event:events(name, event_date), reported_by_profile:profiles(name)"
    )
    .eq("role_name", roleName)
    .in("event_id", events.map((e) => e.id))
    .order("created_at", { ascending: false });

  return ((data as any[] | null) ?? []).map((r) => ({
    id: r.id,
    roleName: r.role_name,
    callOutType: r.call_out_type,
    note: r.note,
    createdAt: r.created_at,
    locationName: r.location?.name ?? "—",
    eventName: r.event?.name ?? "—",
    eventDate: r.event?.event_date ?? "",
    reportedByName: r.reported_by_profile?.name ?? null,
  }));
}

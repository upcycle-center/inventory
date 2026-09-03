import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Location, LocationStaffRole, LocationStaffTier } from "@/lib/supabase/types";
import { getLocationCountLines, latestByProductId } from "@/lib/onHand";
import { lineValue } from "@/lib/inventoryValue";
import { totalRecommendedStaff } from "@/lib/staffing";
import { formatRelativeTime, formatTimestamp } from "@/lib/relativeTime";
import { getDraftTypesForUser } from "@/lib/actionDrafts";
import { DonutChart } from "@/components/DonutChart";
import { Meter } from "@/components/Meter";

function fmtCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  if (profile.role === "stand_lead") {
    const { data: assignments } = await supabase
      .from("event_location_assignments")
      .select("id, event_id, location_id, event:events(id, name, event_date, status), location:locations(id, name)")
      .eq("location_lead_user_id", profile.id)
      .order("created_at", { ascending: false });

    const rows = (assignments as any[]) ?? [];
    const eventIds = [...new Set(rows.map((a) => a.event_id))];
    const { data: eventLocations } = eventIds.length
      ? await supabase.from("event_locations").select("event_id, location_id, is_open, confirmed").in("event_id", eventIds)
      : { data: [] as any[] };

    const eventStatusById = new Map(rows.map((a) => [a.event_id, a.event?.status]));
    const confirmedOpen = new Set(
      ((eventLocations as any[]) ?? [])
        .filter((el) => el.is_open && el.confirmed && eventStatusById.get(el.event_id) === "open")
        .map((el) => `${el.event_id}:${el.location_id}`)
    );

    return (
      <div>
        <h1 className="mb-6 text-lg font-semibold">Your Assignments</h1>
        {!rows.length ? (
          <p className="text-sm text-gray-500">
            You have no location assignments yet. Check with your event admin.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((a: any) => {
              const isOpen = confirmedOpen.has(`${a.event_id}:${a.location_id}`);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium">{a.location?.name}</p>
                    <p className="text-sm text-gray-500">
                      {a.event?.name} · {a.event?.event_date} ·{" "}
                      <span className="uppercase">{a.event?.status}</span>
                    </p>
                  </div>
                  {isOpen ? (
                    <Link
                      href={`/count?event=${a.event?.id}&location=${a.location?.id}`}
                      className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
                    >
                      Open count
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">Not confirmed open yet</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // ---- TOT Inventory: on-hand value per location, rolled up by type ----
  const { data: activeLocationsRaw } = await supabase.from("locations").select("id, name, type").eq("active", true);
  const activeLocations = (activeLocationsRaw as { id: string; name: string; type: string }[] | null) ?? [];
  const activeLocationIds = activeLocations.map((l) => l.id);

  const { data: lastCountRaw } = activeLocationIds.length
    ? await supabase
        .from("location_counts")
        .select("submitted_at")
        .in("location_id", activeLocationIds)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const lastCountSubmittedAt = (lastCountRaw as { submitted_at: string } | null)?.submitted_at ?? null;

  const { data: locationProductsRaw } = activeLocationIds.length
    ? await supabase
        .from("location_products")
        .select("location_id, product_id, product:products(id, case_cost, case_size)")
        .in("location_id", activeLocationIds)
        .eq("active", true)
    : { data: [] as any[] };

  const productsByLocationId = new Map<string, Map<string, any>>();
  for (const row of (locationProductsRaw as any[]) ?? []) {
    if (!row.product) continue;
    const map = productsByLocationId.get(row.location_id) ?? new Map();
    map.set(row.product_id, row.product);
    productsByLocationId.set(row.location_id, map);
  }

  let standValue = 0;
  let mainWarehouseValue = 0;
  let liquorRoomValue = 0;
  let kitchenValue = 0;
  const locationValues: { label: string; value: number }[] = [];
  for (const loc of activeLocations) {
    const lines = await getLocationCountLines(supabase, loc.id);
    const onHand = latestByProductId(lines);
    const products = productsByLocationId.get(loc.id);
    let total = 0;
    if (products) {
      for (const [productId, entry] of onHand) {
        const product = products.get(productId);
        if (product) total += lineValue(entry.qty_each, entry.qty_cases, product);
      }
    }
    if (total > 0) locationValues.push({ label: loc.name, value: total });
    if (loc.type === "stand") standValue += total;
    else if (loc.type === "warehouse") {
      // Same alcohol-warehouse heuristic as src/lib/restockUnit.ts.
      if (/liquor|alcohol/i.test(loc.name)) liquorRoomValue += total;
      else mainWarehouseValue += total;
    } else if (loc.type === "kitchen") kitchenValue += total;
  }

  // ---- Shared: upcoming/open events + their location open/confirm state ----
  const { data: activeEventsRaw } = await supabase
    .from("events")
    .select("id, name, event_date, est_tickets, tot_tickets, tot_tickets_posted_at, status")
    .in("status", ["upcoming", "open"])
    .order("event_date");
  const activeEvents =
    (activeEventsRaw as
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
  const activeEventIds = activeEvents.map((e) => e.id);
  // Count only cares about events that are actually running — an
  // "upcoming" event has nothing to count yet.
  const openEventIds = activeEvents.filter((e) => e.status === "open").map((e) => e.id);

  const { data: eventLocationsRaw } = activeEventIds.length
    ? await supabase
        .from("event_locations")
        .select("event_id, location_id, is_open, confirmed, confirmed_staff_count")
        .in("event_id", activeEventIds)
    : { data: [] as any[] };
  const eventLocationRows =
    (eventLocationsRaw as
      | { event_id: string; location_id: string; is_open: boolean; confirmed: boolean; confirmed_staff_count: number | null }[]
      | null) ?? [];

  // ---- WFM Staff: %Confirmed vs Unconfirmed, across open locations ----
  const openRows = eventLocationRows.filter((r) => r.is_open);
  const confirmedOpenCount = openRows.filter((r) => r.confirmed).length;

  // ---- Events: WFM Shifts — total recommended staff across those events ----
  const { data: standLocationsRaw } = await supabase.from("locations").select("*").eq("active", true).eq("type", "stand");
  const standLocations = (standLocationsRaw as Location[] | null) ?? [];
  const standLocationIds = standLocations.map((l) => l.id);
  const [{ data: staffRolesRaw }, { data: staffTiersRaw }] = standLocationIds.length
    ? await Promise.all([
        supabase.from("location_staff_roles").select("*").in("location_id", standLocationIds),
        supabase.from("location_staff_tiers").select("*").in("location_id", standLocationIds),
      ])
    : [{ data: [] as LocationStaffRole[] }, { data: [] as LocationStaffTier[] }];

  const rolesByLocationId = new Map<string, LocationStaffRole[]>();
  for (const role of (staffRolesRaw as LocationStaffRole[] | null) ?? []) {
    const list = rolesByLocationId.get(role.location_id) ?? [];
    list.push(role);
    rolesByLocationId.set(role.location_id, list);
  }
  const staffTiers = (staffTiersRaw as LocationStaffTier[] | null) ?? [];

  const openByLocationIdByEvent = new Map<string, Map<string, boolean>>();
  for (const r of eventLocationRows) {
    const map = openByLocationIdByEvent.get(r.event_id) ?? new Map();
    map.set(r.location_id, r.is_open);
    openByLocationIdByEvent.set(r.event_id, map);
  }

  const confirmedByLocationIdByEvent = new Map<string, Map<string, boolean>>();
  for (const r of eventLocationRows) {
    const map = confirmedByLocationIdByEvent.get(r.event_id) ?? new Map();
    map.set(r.location_id, r.is_open && r.confirmed);
    confirmedByLocationIdByEvent.set(r.event_id, map);
  }

  let wfmShifts = 0;
  let confirmedShifts = 0;
  const openShiftsByEventId = new Map<string, number>();
  const confirmedShiftsByEventId = new Map<string, number>();
  for (const ev of activeEvents) {
    const openMap = openByLocationIdByEvent.get(ev.id) ?? new Map();
    const confirmedMap = confirmedByLocationIdByEvent.get(ev.id) ?? new Map();
    const openShiftsForEvent = totalRecommendedStaff(standLocationIds, openMap, rolesByLocationId, staffTiers, ev.est_tickets);
    const confirmedShiftsForEvent = totalRecommendedStaff(standLocationIds, confirmedMap, rolesByLocationId, staffTiers, ev.est_tickets);
    wfmShifts += openShiftsForEvent;
    confirmedShifts += confirmedShiftsForEvent;
    openShiftsByEventId.set(ev.id, openShiftsForEvent);
    confirmedShiftsByEventId.set(ev.id, confirmedShiftsForEvent);
  }
  const unconfirmedShifts = wfmShifts - confirmedShifts;

  // ---- Avg staff variance: confirmed_staff_count vs recommended, across
  // confirmed stand locations that have actually reported a headcount ----
  const eventById = new Map(activeEvents.map((e) => [e.id, e]));
  const standLocationIdSet = new Set(standLocationIds);
  let staffVarianceSum = 0;
  let staffVarianceCount = 0;
  for (const r of eventLocationRows) {
    if (!r.confirmed || r.confirmed_staff_count == null || !standLocationIdSet.has(r.location_id)) continue;
    const ev = eventById.get(r.event_id);
    if (!ev) continue;
    const recommended = totalRecommendedStaff(
      [r.location_id],
      new Map([[r.location_id, true]]),
      rolesByLocationId,
      staffTiers,
      ev.est_tickets
    );
    staffVarianceSum += r.confirmed_staff_count - recommended;
    staffVarianceCount += 1;
  }
  const avgStaffVariance = staffVarianceCount ? staffVarianceSum / staffVarianceCount : 0;

  // ---- Count: PDF Printer Ready / By Location / %Completion — OPEN events only ----
  const { data: readyRowsRaw } = openEventIds.length
    ? await supabase
        .from("event_locations")
        .select("event_id, location_id, event:events(id, name, event_date), location:locations(id, name)")
        .in("event_id", openEventIds)
        .eq("is_open", true)
        .eq("confirmed", true)
    : { data: [] as any[] };
  const readyRows = (readyRowsRaw as any[]) ?? [];

  const { data: closingCountsRaw } = openEventIds.length
    ? await supabase.from("location_counts").select("event_id, location_id").in("event_id", openEventIds).eq("type", "closing")
    : { data: [] as any[] };
  const submittedKeys = new Set(
    ((closingCountsRaw as { event_id: string; location_id: string }[] | null) ?? []).map((c) => `${c.event_id}:${c.location_id}`)
  );
  const completedCount = readyRows.filter((r) => submittedKeys.has(`${r.event_id}:${r.location_id}`)).length;

  // ---- Overview buttons: RequestQ lights up while requests are pending;
  // Request/Transfer/Return light up while this user has a saved draft ----
  const { count: pendingRequestCount } = await supabase
    .from("inventory_thresholds")
    .select("id", { count: "exact", head: true })
    .not("requested_at", "is", null);
  const draftTypes = await getDraftTypesForUser(supabase, profile.id);

  const ACTIVE_BUTTON = "rounded-md px-4 py-2 text-sm font-medium text-white";
  const IDLE_BUTTON = "rounded-md border border-gray-300 px-4 py-2 text-sm";

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/restock-requests"
          className={pendingRequestCount ? `${ACTIVE_BUTTON} bg-orange-500` : IDLE_BUTTON}
        >
          RequestQ{pendingRequestCount ? ` (${pendingRequestCount})` : ""}
        </Link>
        <Link href="/transfer" className={draftTypes.has("transfer") ? `${ACTIVE_BUTTON} bg-purple-600` : IDLE_BUTTON}>
          Transfer
        </Link>
        <Link href="/return" className={draftTypes.has("return") ? `${ACTIVE_BUTTON} bg-fuchsia-600` : IDLE_BUTTON}>
          Return
        </Link>
      </div>

      <Section
        title="TOT Inventory"
        actions={
          <div className="flex items-center gap-3">
            {lastCountSubmittedAt && (
              <span className="text-xs text-gray-400" title={formatTimestamp(lastCountSubmittedAt)}>
                Last count: {formatRelativeTime(lastCountSubmittedAt)}
              </span>
            )}
            <Link
              href="/api/inventory-value/export"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Export CSV
            </Link>
            <Link
              href="/api/inventory-value/pdf"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Export PDF
            </Link>
          </div>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="TOT $Warehouse" value={fmtCurrency(mainWarehouseValue)} />
          <StatCard label="TOT $Liquor Room" value={fmtCurrency(liquorRoomValue)} />
          <StatCard label="TOT $Kitchen" value={fmtCurrency(kitchenValue)} />
          <StatCard label="TOT $Stands" value={fmtCurrency(standValue)} />
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-medium text-gray-500">By location</p>
          <DonutChart slices={locationValues} centerLabel="on hand" emptyLabel="No inventory value on record yet." />
        </div>
      </Section>

      <Section title="Events">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <WfmShiftsCard shifts={wfmShifts} confirmed={confirmedShifts} pending={unconfirmedShifts} />
          <ConfirmedSplitBar confirmed={confirmedOpenCount} total={openRows.length} />
          <StatCard
            label="Avg staff variance (confirmed vs recommended)"
            value={avgStaffVariance > 0 ? `+${avgStaffVariance.toFixed(1)}` : avgStaffVariance.toFixed(1)}
          />
        </div>
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="px-4 py-2">Event Date</th>
                <th className="px-4 py-2">Event Name</th>
                <th className="px-4 py-2">Open Shifts</th>
                <th className="px-4 py-2">Confirmed Shifts</th>
                <th className="px-4 py-2">EST Attendance</th>
                <th className="px-4 py-2">TOT Attendance</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeEvents.map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-500">{e.event_date}</td>
                  <td className="px-4 py-2">
                    <Link href={`/admin/events/${e.id}`} className="text-brand hover:underline">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{openShiftsByEventId.get(e.id) ?? 0}</td>
                  <td className="px-4 py-2 text-gray-500">{confirmedShiftsByEventId.get(e.id) ?? 0}</td>
                  <td className="px-4 py-2 text-gray-500">{e.est_tickets ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{e.tot_tickets_posted_at ? e.tot_tickets : "—"}</td>
                  <td className="px-4 py-2 uppercase text-gray-500">{e.status}</td>
                </tr>
              ))}
              {!activeEvents.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    No upcoming or open events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Count">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/count"
            className="block rounded-md border border-gray-200 bg-white p-5 hover:border-brand"
          >
            <p className="text-2xl font-semibold">{readyRows.length}</p>
            <p className="text-sm text-gray-500">PDF Printer Ready</p>
          </Link>
          <div className="rounded-md border border-gray-200 bg-white p-4">
            <Meter label="Completion (closing counts submitted)" numerator={completedCount} denominator={readyRows.length} color="#1baf7a" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {readyRows.map((r) => {
                const done = submittedKeys.has(`${r.event_id}:${r.location_id}`);
                return (
                  <tr key={`${r.event_id}:${r.location_id}`} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <Link href={`/admin/events/${r.event_id}`} className="text-brand hover:underline">
                        {r.location?.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {r.event?.name} · {r.event?.event_date}
                    </td>
                    <td className="px-4 py-2">
                      {done ? (
                        <span className="text-green-600">✓ Submitted</span>
                      ) : (
                        <span className="text-amber-600">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!readyRows.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                    No locations are open and confirmed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function ConfirmedSplitBar({ confirmed, total }: { confirmed: number; total: number }) {
  const confirmedPct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const unconfirmedPct = 100 - confirmedPct;

  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <p className="mb-2 text-center text-sm font-medium">
        confirmed {confirmedPct}% : {unconfirmedPct}% unconfirmed
      </p>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full bg-green-500" style={{ width: `${confirmedPct}%` }} />
        <div className="h-full bg-yellow-400" style={{ width: `${unconfirmedPct}%` }} />
      </div>
    </div>
  );
}

function WfmShiftsCard({ shifts, confirmed, pending }: { shifts: number; confirmed: number; pending: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-center gap-3">
        <div className="text-center">
          <p className="text-2xl font-bold">{shifts}</p>
          <p className="text-xs text-gray-500">shifts</p>
        </div>
        <p className="text-2xl font-bold text-gray-300">:</p>
        <div className="text-center">
          <p className="text-2xl font-bold">{confirmed}</p>
          <p className="text-xs text-gray-500">confirmed</p>
        </div>
        <p className="text-2xl font-bold text-gray-300">:</p>
        <div className="text-center">
          <p className="text-2xl font-bold">{pending}</p>
          <p className="text-xs text-gray-500">pending</p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Location, LocationStaffRole, LocationStaffTier } from "@/lib/supabase/types";
import { getLocationCountLines, latestByProductId } from "@/lib/onHand";
import { lineValue } from "@/lib/inventoryValue";
import { effectiveCount, totalRecommendedStaff } from "@/lib/staffing";
import { STAFF_ROLES } from "@/lib/staffRoles";
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

    const confirmedOpen = new Set(
      ((eventLocations as any[]) ?? [])
        .filter((el) => el.is_open && el.confirmed)
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

  const [{ count: locationCount }, { count: openEventCount }, { count: openRequestCount }] = await Promise.all([
    supabase.from("locations").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("inventory_thresholds").select("*", { count: "exact", head: true }).not("requested_at", "is", null),
  ]);

  // ---- TOT Inventory: on-hand value per location, rolled up by type ----
  const { data: activeLocationsRaw } = await supabase.from("locations").select("id, name, type").eq("active", true);
  const activeLocations = (activeLocationsRaw as { id: string; name: string; type: string }[] | null) ?? [];
  const activeLocationIds = activeLocations.map((l) => l.id);

  const { data: locationProductsRaw } = activeLocationIds.length
    ? await supabase
        .from("location_products")
        .select("location_id, product_id, product:products(id, unit_cost, unit_of_measure, case_size)")
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
  let warehouseValue = 0;
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
    else if (loc.type === "warehouse") warehouseValue += total;
    else if (loc.type === "kitchen") kitchenValue += total;
  }

  // ---- Shared: upcoming/open events + their location open/confirm state ----
  const { data: activeEventsRaw } = await supabase
    .from("events")
    .select("id, name, event_date, est_tickets")
    .in("status", ["upcoming", "open"])
    .order("event_date");
  const activeEvents = (activeEventsRaw as { id: string; name: string; event_date: string; est_tickets: number | null }[] | null) ?? [];
  const activeEventIds = activeEvents.map((e) => e.id);

  const { data: eventLocationsRaw } = activeEventIds.length
    ? await supabase.from("event_locations").select("event_id, location_id, is_open, confirmed").in("event_id", activeEventIds)
    : { data: [] as any[] };
  const eventLocationRows = (eventLocationsRaw as { event_id: string; location_id: string; is_open: boolean; confirmed: boolean }[] | null) ?? [];

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

  let wfmShifts = 0;
  for (const ev of activeEvents) {
    const openMap = openByLocationIdByEvent.get(ev.id) ?? new Map();
    wfmShifts += totalRecommendedStaff(standLocationIds, openMap, rolesByLocationId, staffTiers, ev.est_tickets);
  }

  // ---- WFM Staff: TOT Headcount — role split across CONFIRMED locations
  // only (not just open), since that's the staffing that's actually locked in.
  const confirmedLocationIdsByEvent = new Map<string, string[]>();
  for (const r of eventLocationRows) {
    if (!r.is_open || !r.confirmed) continue;
    const list = confirmedLocationIdsByEvent.get(r.event_id) ?? [];
    list.push(r.location_id);
    confirmedLocationIdsByEvent.set(r.event_id, list);
  }

  let leadHeadcount = 0;
  const roleHeadcounts = new Map<string, number>();
  for (const ev of activeEvents) {
    const confirmedLocationIds = confirmedLocationIdsByEvent.get(ev.id) ?? [];
    for (const locationId of confirmedLocationIds) {
      leadHeadcount += 1;
      const roles = rolesByLocationId.get(locationId) ?? [];
      for (const roleName of STAFF_ROLES) {
        const role = roles.find((r) => r.role_name === roleName);
        if (!role) continue;
        const { count } = effectiveCount(role, staffTiers, ev.est_tickets);
        roleHeadcounts.set(roleName, (roleHeadcounts.get(roleName) ?? 0) + count);
      }
    }
  }
  const totHeadcount = leadHeadcount + Array.from(roleHeadcounts.values()).reduce((a, b) => a + b, 0);
  const headcountSlices = [
    { label: "Stand Lead", value: leadHeadcount },
    ...STAFF_ROLES.map((roleName) => ({ label: roleName, value: roleHeadcounts.get(roleName) ?? 0 })),
  ];

  // ---- Count: PDF Printer Ready / By Location / %Completion ----
  const { data: readyRowsRaw } = activeEventIds.length
    ? await supabase
        .from("event_locations")
        .select("event_id, location_id, event:events(id, name, event_date), location:locations(id, name)")
        .in("event_id", activeEventIds)
        .eq("is_open", true)
        .eq("confirmed", true)
    : { data: [] as any[] };
  const readyRows = (readyRowsRaw as any[]) ?? [];

  const { data: closingCountsRaw } = activeEventIds.length
    ? await supabase.from("location_counts").select("event_id, location_id").in("event_id", activeEventIds).eq("type", "closing")
    : { data: [] as any[] };
  const submittedKeys = new Set(
    ((closingCountsRaw as { event_id: string; location_id: string }[] | null) ?? []).map((c) => `${c.event_id}:${c.location_id}`)
  );
  const completedCount = readyRows.filter((r) => submittedKeys.has(`${r.event_id}:${r.location_id}`)).length;

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Active locations" value={locationCount ?? 0} href="/admin/locations" />
        <SummaryCard label="Open events" value={openEventCount ?? 0} href="/admin/events" />
        <SummaryCard label="Open restock requests" value={openRequestCount ?? 0} href="/restock-requests" />
      </div>
      <div className="mt-8 flex gap-3">
        <Link href="/receive" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Receive
        </Link>
        <Link href="/transfer" className="rounded-md border border-gray-300 px-4 py-2 text-sm">
          Transfer
        </Link>
      </div>

      <Section title="TOT Inventory">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="TOT $Value — Stand" value={fmtCurrency(standValue)} />
          <StatCard label="TOT $Value — Warehouse" value={fmtCurrency(warehouseValue)} />
          <StatCard label="TOT $Value — Kitchen" value={fmtCurrency(kitchenValue)} />
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-medium text-gray-500">By location</p>
          <DonutChart slices={locationValues} centerLabel="on hand" emptyLabel="No inventory value on record yet." />
        </div>
      </Section>

      <Section title="WFM Staff">
        <div className="mb-4 max-w-xs rounded-md border border-gray-200 bg-white p-4">
          <Meter
            label="Confirmed vs unconfirmed (open locations, upcoming/open events)"
            numerator={confirmedOpenCount}
            denominator={openRows.length}
          />
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-medium text-gray-500">
            TOT Headcount — {totHeadcount} confirmed, by role
          </p>
          <DonutChart
            slices={headcountSlices}
            centerLabel="confirmed"
            format="count"
            emptyLabel="No confirmed staffing yet."
          />
        </div>
      </Section>

      <Section title="Events">
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="WFM Shifts (recommended staff, upcoming/open events)" value={String(wfmShifts)} />
          <StatCard label="Events tracked" value={String(activeEvents.length)} />
        </div>
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">EST Attendance</th>
              </tr>
            </thead>
            <tbody>
              {activeEvents.map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/admin/events/${e.id}`} className="text-brand hover:underline">
                      {e.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{e.event_date}</td>
                  <td className="px-4 py-2 text-gray-500">{e.est_tickets ?? "—"}</td>
                </tr>
              ))}
              {!activeEvents.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
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

function SummaryCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="block rounded-md border border-gray-200 bg-white p-5 hover:border-brand">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Link>
  );
}

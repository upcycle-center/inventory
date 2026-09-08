import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sortStorageAreas } from "@/lib/storageAreas";
import { getOnHandByProductId, eachEquivalent } from "@/lib/onHand";
import { CountForm } from "./CountForm";
import { EventsAccordion, type EventLocationStatus } from "./EventsAccordion";
import { CompletedCountsAccordion, type CompletedEventRow, type CompletedCountRecord } from "./CompletedCountsAccordion";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LocationLabel } from "@/components/LocationLabel";
import { locationDisplayName } from "@/lib/locationLabel";
import type { CountType, Event } from "@/lib/supabase/types";

const COUNT_BREADCRUMB = { label: "Count", href: "/count" };

export default async function CountPage({
  searchParams,
}: {
  searchParams: { event?: string; location?: string };
}) {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();
  const { event: eventId, location: locationId } = searchParams;
  const isWarehouseOrAdmin = profile.role !== "stand_lead";

  if (!eventId) {
    return <EventsPicker userId={profile.id} isWarehouseOrAdmin={isWarehouseOrAdmin} />;
  }

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single<Event>();
  if (!event) {
    return <p className="text-sm text-gray-500">Event not found.</p>;
  }

  // Events must be worked in date order — the next event's opening count
  // carries over from the previous one's closing count, so an earlier
  // event left open (not yet auto-closed) blocks starting this one.
  const { data: earlierOpenEvents } = await supabase
    .from("events")
    .select("id, name, event_date")
    .eq("status", "open")
    .lt("event_date", event.event_date)
    .neq("id", eventId)
    .order("event_date", { ascending: true })
    .limit(1);
  const blocker = (earlierOpenEvents as { id: string; name: string; event_date: string }[] | null)?.[0];

  const eventBreadcrumb = (
    <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, COUNT_BREADCRUMB, { label: event.name }]} />
  );

  if (blocker) {
    return (
      <div>
        {eventBreadcrumb}
        <p className="text-sm text-gray-500">
          {blocker.name} ({blocker.event_date}) must be fully closed out before counts can start for {event.name}.
        </p>
      </div>
    );
  }

  if (!locationId) {
    return <LocationsForEvent event={event} userId={profile.id} isWarehouseOrAdmin={isWarehouseOrAdmin} />;
  }

  const [{ data: location }, { data: existingCounts }, { data: eventLocation }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", locationId).single(),
    supabase.from("location_counts").select("type, submitted_at").eq("event_id", eventId).eq("location_id", locationId),
    supabase.from("event_locations").select("is_open, confirmed").eq("event_id", eventId).eq("location_id", locationId).maybeSingle(),
  ]);

  if (!location) {
    return <p className="text-sm text-gray-500">Location not found.</p>;
  }

  const breadcrumb = (
    <Breadcrumbs
      items={[
        { label: "Dashboard", href: "/dashboard" },
        COUNT_BREADCRUMB,
        { label: event.name, href: `/count?event=${eventId}` },
        { label: locationDisplayName(location) },
      ]}
    />
  );

  if (event.status !== "open" || !eventLocation?.is_open || !eventLocation?.confirmed) {
    return (
      <div>
        {breadcrumb}
        <p className="text-sm text-gray-500">
          <LocationLabel location={location} /> isn&apos;t confirmed as open for {event.name} yet. Check with your
          event admin.
        </p>
      </div>
    );
  }

  if (profile.role === "stand_lead" && location.backup_lead_user_id !== profile.id) {
    const { data: assignment } = await supabase
      .from("event_location_assignments")
      .select("id")
      .eq("event_id", eventId)
      .eq("location_id", locationId)
      .eq("location_lead_user_id", profile.id)
      .maybeSingle();

    if (!assignment) {
      return (
        <div>
          {breadcrumb}
          <p className="text-sm text-gray-500">
            You&apos;re not assigned to <LocationLabel location={location} /> for {event.name}. Check with your
            event admin.
          </p>
        </div>
      );
    }
  }

  const doneTypes = new Set((existingCounts ?? []).map((c) => c.type as CountType));

  if (doneTypes.has("opening") && doneTypes.has("closing")) {
    return (
      <div>
        {breadcrumb}
        <h1 className="mb-2 text-lg font-semibold">
          <LocationLabel location={location} />
        </h1>
        <p className="text-sm text-gray-500">
          Both the opening and closing counts for {event.name} are already submitted.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-brand hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const type: CountType = doneTypes.has("opening") ? "closing" : "opening";

  const { data: locationProducts } = await supabase
    .from("location_products")
    .select(
      "product:products(id, sku, description, photo_url, active), storage_area:storage_areas(id, code, name)"
    )
    .eq("location_id", locationId)
    .eq("active", true);

  const areaMap = new Map<string, { id: string; code: string; name: string; products: any[] }>();

  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const area = row.storage_area;
    if (!areaMap.has(area.id)) {
      areaMap.set(area.id, { id: area.id, code: area.code, name: area.name, products: [] });
    }
    areaMap.get(area.id)!.products.push(row.product);
  }

  const groups = sortStorageAreas(Array.from(areaMap.values()));

  if (!groups.length) {
    return (
      <div>
        {breadcrumb}
        <h1 className="mb-2 text-lg font-semibold">
          <LocationLabel location={location} />
        </h1>
        <p className="text-sm text-gray-500">
          No products are assigned to this location yet. An admin can add them under Admin → Locations.
        </p>
      </div>
    );
  }

  // Opening counts carry over the location's last submitted (closing) count
  // instead of starting blank — the physical stock on hand doesn't reset
  // between events, so re-counting from zero would just be re-typing the
  // same numbers.
  let initialQty: Record<string, { each: string; cases: string }> = {};
  if (type === "opening") {
    const onHand = await getOnHandByProductId(supabase, locationId);
    initialQty = Object.fromEntries(
      Array.from(onHand.entries()).map(([productId, line]) => [
        productId,
        { each: line.qty_each != null ? String(line.qty_each) : "", cases: line.qty_cases != null ? String(line.qty_cases) : "" },
      ])
    );
  }

  return (
    <div>
      {breadcrumb}
      <p className="mb-1 text-sm text-gray-500">
        <LocationLabel location={location} /> · {event.name}
      </p>
      <CountForm eventId={eventId} locationId={locationId} type={type} groups={groups} initialQty={initialQty} />
    </div>
  );
}

async function EventsPicker({ userId, isWarehouseOrAdmin }: { userId: string; isWarehouseOrAdmin: boolean }) {
  const supabase = createClient();

  // Managers see recent events regardless of status (open events still
  // missing sheets land in "Open Events"; fully counted ones -- closed or
  // not -- land in "Completed Counts" below) capped to a reasonable
  // window. Stand leads only ever need their own upcoming/open work.
  let query = isWarehouseOrAdmin
    ? supabase.from("events").select("id, name, event_date, status, tot_tickets").order("event_date", { ascending: false }).limit(60)
    : supabase
        .from("events")
        .select("id, name, event_date, status, tot_tickets")
        .in("status", ["upcoming", "open"])
        .order("event_date", { ascending: true });

  if (!isWarehouseOrAdmin) {
    const [{ data: assignments }, { data: backupLocations }] = await Promise.all([
      supabase.from("event_location_assignments").select("event_id").eq("location_lead_user_id", userId),
      supabase.from("locations").select("id").eq("backup_lead_user_id", userId),
    ]);
    const backupLocationIds = ((backupLocations as { id: string }[] | null) ?? []).map((l) => l.id);
    const { data: backupEventLocations } = backupLocationIds.length
      ? await supabase.from("event_locations").select("event_id").in("location_id", backupLocationIds).eq("is_open", true).eq("confirmed", true)
      : { data: [] as { event_id: string }[] };

    const assignedEventIds = [
      ...new Set([
        ...((assignments as { event_id: string }[] | null) ?? []).map((a) => a.event_id),
        ...((backupEventLocations as { event_id: string }[] | null) ?? []).map((r) => r.event_id),
      ]),
    ];
    if (!assignedEventIds.length) {
      return (
        <div>
          <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Count" }]} />
          <EventsAccordion title="Your assignments" rows={[]} />
        </div>
      );
    }
    query = query.in("id", assignedEventIds);
  }

  const { data: eventsRaw } = await query;
  const events = (eventsRaw as { id: string; name: string; event_date: string; status: string; tot_tickets: number | null }[] | null) ?? [];
  const eventIds = events.map((e) => e.id);

  const { data: eventLocationsRaw } = eventIds.length
    ? await supabase
        .from("event_locations")
        .select("event_id, location_id, location:locations(id, name, type, yellow_dog_code)")
        .in("event_id", eventIds)
        .eq("is_open", true)
        .eq("confirmed", true)
    : { data: [] as any[] };

  const locationsByEvent = new Map<string, { id: string; name: string; type: string; yellow_dog_code: string | null }[]>();
  for (const row of (eventLocationsRaw as any[]) ?? []) {
    if (!row.location) continue;
    const list = locationsByEvent.get(row.event_id) ?? [];
    list.push(row.location);
    locationsByEvent.set(row.event_id, list);
  }

  const { data: allCountsRaw } = eventIds.length
    ? await supabase.from("location_counts").select("event_id, location_id, type").in("event_id", eventIds)
    : { data: [] as any[] };
  const doneTypesByKey = new Map<string, Set<CountType>>();
  for (const c of (allCountsRaw as { event_id: string; location_id: string; type: CountType }[] | null) ?? []) {
    const key = `${c.event_id}:${c.location_id}`;
    const set = doneTypesByKey.get(key) ?? new Set<CountType>();
    set.add(c.type);
    doneTypesByKey.set(key, set);
  }

  const rows = events.map((e) => {
    const eventLocations = locationsByEvent.get(e.id) ?? [];
    const locations = eventLocations.map((loc) => {
      const done = doneTypesByKey.get(`${e.id}:${loc.id}`) ?? new Set<CountType>();
      const status: EventLocationStatus["status"] = done.has("closing")
        ? "complete"
        : done.has("opening")
        ? "opening_only"
        : "not_started";
      return { id: loc.id, name: loc.name, yellow_dog_code: loc.yellow_dog_code, status };
    });

    const standLocations = eventLocations.filter((loc) => loc.type === "stand");
    const standsOpened = standLocations.length;
    const completed = standLocations.filter((loc) => doneTypesByKey.get(`${e.id}:${loc.id}`)?.has("closing")).length;
    const pctCompletion = standsOpened ? Math.round((completed / standsOpened) * 100) : 0;

    return { ...e, standsOpened, pctCompletion, locations };
  });

  // Events still missing at least one closing count stay in "Open Events";
  // events every stand has fully closed out move to "Completed Counts"
  // below instead of just disappearing once the event auto-closes.
  const openRows = rows.filter((r) => r.standsOpened === 0 || r.pctCompletion < 100);
  const fullyCompletedRows = rows.filter((r) => r.standsOpened > 0 && r.pctCompletion === 100);

  const completedEventRows = isWarehouseOrAdmin
    ? await buildCompletedCountRows(supabase, fullyCompletedRows)
    : [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Count" }]} />
      <EventsAccordion
        title={isWarehouseOrAdmin ? "Open Events" : "Your assignments"}
        rows={openRows}
        isManager={isWarehouseOrAdmin}
      />
      {isWarehouseOrAdmin && (
        <div className="mt-10">
          <CompletedCountsAccordion rows={completedEventRows} />
        </div>
      )}
    </div>
  );
}

// Every individual count record (opening + closing, one row per stand per
// type) for a set of fully-completed events, oldest submitted first --
// "completed FIRST to completed LAST" within each event. Threshold Flag is
// derived, not stored: true when any line in that count is at or below the
// (location, product) reorder_threshold on file.
async function buildCompletedCountRows(
  supabase: SupabaseClient,
  fullyCompletedRows: { id: string; name: string; event_date: string }[]
): Promise<CompletedEventRow[]> {
  const eventIds = fullyCompletedRows.map((r) => r.id);
  if (!eventIds.length) return [];

  const { data: countsRaw } = await supabase
    .from("location_counts")
    .select("id, event_id, location_id, type, submitted_at, user_id, location:locations(name, yellow_dog_code)")
    .in("event_id", eventIds)
    .order("submitted_at", { ascending: true });
  const counts = (countsRaw as any[]) ?? [];
  if (!counts.length) return [];

  const countIds = counts.map((c) => c.id);
  const locationIds = [...new Set(counts.map((c) => c.location_id))];
  const userIds = [...new Set(counts.map((c) => c.user_id).filter(Boolean))];

  const [{ data: linesRaw }, { data: thresholdsRaw }, { data: productsRaw }, { data: usersRaw }] = await Promise.all([
    supabase.from("location_count_lines").select("location_count_id, product_id, qty_each, qty_cases").in("location_count_id", countIds),
    locationIds.length
      ? supabase
          .from("inventory_thresholds")
          .select("product_id, location_id, reorder_threshold")
          .in("location_id", locationIds)
          .gt("reorder_threshold", 0)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("products").select("id, case_size"),
    userIds.length ? supabase.from("profiles").select("id, name").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const linesByCountId = new Map<string, { product_id: string; qty_each: number | null; qty_cases: number | null }[]>();
  for (const l of (linesRaw as any[]) ?? []) {
    const list = linesByCountId.get(l.location_count_id) ?? [];
    list.push(l);
    linesByCountId.set(l.location_count_id, list);
  }
  const thresholdByKey = new Map(
    ((thresholdsRaw as { product_id: string; location_id: string; reorder_threshold: number }[] | null) ?? []).map((t) => [
      `${t.location_id}:${t.product_id}`,
      t.reorder_threshold,
    ])
  );
  const caseSizeByProductId = new Map(
    ((productsRaw as { id: string; case_size: number | null }[] | null) ?? []).map((p) => [p.id, p.case_size])
  );
  const nameByUserId = new Map(((usersRaw as { id: string; name: string }[] | null) ?? []).map((u) => [u.id, u.name]));

  const recordsByEvent = new Map<string, CompletedCountRecord[]>();
  for (const c of counts) {
    const lines = linesByCountId.get(c.id) ?? [];
    const thresholdFlag = lines.some((l) => {
      const threshold = thresholdByKey.get(`${c.location_id}:${l.product_id}`);
      if (threshold == null) return false;
      return eachEquivalent(l.qty_each, l.qty_cases, caseSizeByProductId.get(l.product_id)) <= threshold;
    });
    const record: CompletedCountRecord = {
      id: c.id,
      locationName: c.location?.name ?? "",
      yellowDogCode: c.location?.yellow_dog_code ?? null,
      type: c.type,
      submittedAt: c.submitted_at,
      postedByName: nameByUserId.get(c.user_id) ?? "—",
      thresholdFlag,
    };
    const list = recordsByEvent.get(c.event_id) ?? [];
    list.push(record);
    recordsByEvent.set(c.event_id, list);
  }

  return fullyCompletedRows
    .map((r) => ({ id: r.id, name: r.name, event_date: r.event_date, records: recordsByEvent.get(r.id) ?? [] }))
    .filter((r) => r.records.length > 0);
}

async function LocationsForEvent({
  event,
  userId,
  isWarehouseOrAdmin,
}: {
  event: Event;
  userId: string;
  isWarehouseOrAdmin: boolean;
}) {
  const supabase = createClient();

  const { data: openLocationsRaw } = await supabase
    .from("event_locations")
    .select("location_id, location:locations(id, name, yellow_dog_code)")
    .eq("event_id", event.id)
    .eq("is_open", true)
    .eq("confirmed", true);

  let rows = (openLocationsRaw as any[]) ?? [];

  if (!isWarehouseOrAdmin) {
    const [{ data: assignments }, { data: backupLocations }] = await Promise.all([
      supabase.from("event_location_assignments").select("location_id").eq("event_id", event.id).eq("location_lead_user_id", userId),
      supabase.from("locations").select("id").eq("backup_lead_user_id", userId),
    ]);
    const assignedLocationIds = new Set([
      ...((assignments as { location_id: string }[] | null) ?? []).map((a) => a.location_id),
      ...((backupLocations as { id: string }[] | null) ?? []).map((l) => l.id),
    ]);
    rows = rows.filter((r) => assignedLocationIds.has(r.location_id));
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, COUNT_BREADCRUMB, { label: event.name }]} />
      <h1 className="mb-6 text-lg font-semibold">
        {event.name} · {event.event_date}
      </h1>
      {!rows.length ? (
        <p className="text-sm text-gray-500">
          {isWarehouseOrAdmin ? "No locations opened yet." : "You have no location assignments for this event."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.location_id} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4">
              <p className="font-medium">{r.location && <LocationLabel location={r.location} />}</p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/api/count-sheet/pdf?event=${event.id}&location=${r.location_id}`}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Download PDF
                </Link>
                <Link
                  href={`/count?event=${event.id}&location=${r.location_id}`}
                  className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
                >
                  Open count
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

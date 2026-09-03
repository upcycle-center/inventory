import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sortStorageAreas } from "@/lib/storageAreas";
import { getOnHandByProductId } from "@/lib/onHand";
import { CountForm } from "./CountForm";
import { EventsAccordion, type EventLocationStatus } from "./EventsAccordion";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { CountType, Event } from "@/lib/supabase/types";

const COUNT_BREADCRUMB = { label: "Count", href: "/count" };

export default async function CountPage({
  searchParams,
}: {
  searchParams: { event?: string; location?: string };
}) {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering"]);
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
        { label: location.name },
      ]}
    />
  );

  if (event.status !== "open" || !eventLocation?.is_open || !eventLocation?.confirmed) {
    return (
      <div>
        {breadcrumb}
        <p className="text-sm text-gray-500">
          {location.name} isn&apos;t confirmed as open for {event.name} yet. Check with your event admin.
        </p>
      </div>
    );
  }

  if (profile.role === "stand_lead") {
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
            You&apos;re not assigned to {location.name} for {event.name}. Check with your event admin.
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
        <h1 className="mb-2 text-lg font-semibold">{location.name}</h1>
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
        <h1 className="mb-2 text-lg font-semibold">{location.name}</h1>
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
        {location.name} · {event.name}
      </p>
      <CountForm eventId={eventId} locationId={locationId} type={type} groups={groups} initialQty={initialQty} />
    </div>
  );
}

async function EventsPicker({ userId, isWarehouseOrAdmin }: { userId: string; isWarehouseOrAdmin: boolean }) {
  const supabase = createClient();

  let query = supabase
    .from("events")
    .select("id, name, event_date, status, tot_tickets")
    .in("status", ["upcoming", "open"])
    .order("event_date", { ascending: true });

  if (!isWarehouseOrAdmin) {
    const { data: assignments } = await supabase
      .from("event_location_assignments")
      .select("event_id")
      .eq("location_lead_user_id", userId);
    const assignedEventIds = [...new Set(((assignments as { event_id: string }[] | null) ?? []).map((a) => a.event_id))];
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
        .select("event_id, location_id, location:locations(id, name, type)")
        .in("event_id", eventIds)
        .eq("is_open", true)
        .eq("confirmed", true)
    : { data: [] as any[] };

  const locationsByEvent = new Map<string, { id: string; name: string; type: string }[]>();
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
      return { id: loc.id, name: loc.name, status };
    });

    const standLocations = eventLocations.filter((loc) => loc.type === "stand");
    const standsOpened = standLocations.length;
    const completed = standLocations.filter((loc) => doneTypesByKey.get(`${e.id}:${loc.id}`)?.has("closing")).length;
    const pctCompletion = standsOpened ? Math.round((completed / standsOpened) * 100) : 0;

    return { ...e, standsOpened, pctCompletion, locations };
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Count" }]} />
      <EventsAccordion title={isWarehouseOrAdmin ? "Open Events" : "Your assignments"} rows={rows} />
    </div>
  );
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
    .select("location_id, location:locations(id, name)")
    .eq("event_id", event.id)
    .eq("is_open", true)
    .eq("confirmed", true);

  let rows = (openLocationsRaw as any[]) ?? [];

  if (!isWarehouseOrAdmin) {
    const { data: assignments } = await supabase
      .from("event_location_assignments")
      .select("location_id")
      .eq("event_id", event.id)
      .eq("location_lead_user_id", userId);
    const assignedLocationIds = new Set(((assignments as { location_id: string }[] | null) ?? []).map((a) => a.location_id));
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
              <p className="font-medium">{r.location?.name}</p>
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

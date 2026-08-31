import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sortStorageAreas } from "@/lib/storageAreas";
import { CountForm } from "./CountForm";
import type { CountType } from "@/lib/supabase/types";

export default async function CountPage({
  searchParams,
}: {
  searchParams: { event?: string; location?: string };
}) {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead"]);
  const supabase = createClient();
  const { event: eventId, location: locationId } = searchParams;

  if (!eventId || !locationId) {
    return (
      <CountPicker
        userId={profile.id}
        isWarehouseOrAdmin={profile.role === "admin" || profile.role === "warehouse"}
      />
    );
  }

  const [{ data: event }, { data: location }, { data: existingCounts }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from("locations").select("*").eq("id", locationId).single(),
    supabase.from("location_counts").select("type, submitted_at").eq("event_id", eventId).eq("location_id", locationId),
  ]);

  if (!event || !location) {
    return <p className="text-sm text-gray-500">Event or location not found.</p>;
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
        <p className="text-sm text-gray-500">
          You&apos;re not assigned to {location.name} for {event.name}. Check with your event admin.
        </p>
      );
    }
  }

  const doneTypes = new Set((existingCounts ?? []).map((c) => c.type as CountType));

  if (doneTypes.has("opening") && doneTypes.has("closing")) {
    return (
      <div>
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
        <h1 className="mb-2 text-lg font-semibold">{location.name}</h1>
        <p className="text-sm text-gray-500">
          No products are assigned to this location yet. An admin can add them under Admin → Locations.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-sm text-gray-500">
        {location.name} · {event.name}
      </p>
      <CountForm eventId={eventId} locationId={locationId} type={type} groups={groups} />
    </div>
  );
}

async function CountPicker({ userId, isWarehouseOrAdmin }: { userId: string; isWarehouseOrAdmin: boolean }) {
  const supabase = createClient();

  if (isWarehouseOrAdmin) {
    const { data: assignments } = await supabase
      .from("event_location_assignments")
      .select("id, event:events(id, name, event_date), location:locations(id, name)")
      .order("created_at", { ascending: false });

    return <PickerList title="Pick an event & location to count" assignments={(assignments as any[]) ?? []} />;
  }

  const { data: assignments } = await supabase
    .from("event_location_assignments")
    .select("id, event:events(id, name, event_date), location:locations(id, name)")
    .eq("location_lead_user_id", userId)
    .order("created_at", { ascending: false });

  return <PickerList title="Your assignments" assignments={(assignments as any[]) ?? []} />;
}

function PickerList({ title, assignments }: { title: string; assignments: any[] }) {
  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">{title}</h1>
      {!assignments.length ? (
        <p className="text-sm text-gray-500">No assignments found.</p>
      ) : (
        <ul className="space-y-3">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{a.location?.name}</p>
                <p className="text-sm text-gray-500">
                  {a.event?.name} · {a.event?.event_date}
                </p>
              </div>
              <Link
                href={`/count?event=${a.event?.id}&location=${a.location?.id}`}
                className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
              >
                Open count
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

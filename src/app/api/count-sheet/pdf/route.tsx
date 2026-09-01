import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { sortStorageAreas } from "@/lib/storageAreas";
import { CountSheetDocument } from "@/lib/pdf/CountSheetDocument";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event");
  const locationId = searchParams.get("location");
  if (!eventId || !locationId) return new Response("Missing event or location", { status: 400 });

  const supabase = createClient();

  const [{ data: event }, { data: location }, { data: assignment }, { data: locationProducts }] = await Promise.all([
    supabase.from("events").select("id, name, event_date, est_tickets").eq("id", eventId).single(),
    supabase.from("locations").select("id, name, yellow_dog_code").eq("id", locationId).single(),
    supabase
      .from("event_location_assignments")
      .select("location_lead:profiles(name)")
      .eq("event_id", eventId)
      .eq("location_id", locationId)
      .maybeSingle(),
    supabase
      .from("location_products")
      .select("product:products(sku, description, active), storage_area:storage_areas(id, code, name)")
      .eq("location_id", locationId)
      .eq("active", true),
  ]);

  if (!event || !location) return new Response("Not found", { status: 404 });

  // Same access rule as /count: managers see any location, a stand lead
  // only the location(s) they're assigned to for this event.
  const isManager = ["admin", "warehouse", "kitchen", "catering"].includes(profile.role);
  if (!isManager) {
    const { data: myAssignment } = await supabase
      .from("event_location_assignments")
      .select("id")
      .eq("event_id", eventId)
      .eq("location_id", locationId)
      .eq("location_lead_user_id", profile.id)
      .maybeSingle();
    if (!myAssignment) return new Response("Forbidden", { status: 403 });
  }

  const areaMap = new Map<
    string,
    { area: { id: string; code: string; name: string }; products: { sku: string; description: string }[] }
  >();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const entry = areaMap.get(row.storage_area.id) ?? { area: row.storage_area, products: [] as { sku: string; description: string }[] };
    entry.products.push(row.product);
    areaMap.set(row.storage_area.id, entry);
  }
  const areas = sortStorageAreas(Array.from(areaMap.values()).map((e) => e.area)).map((area) => {
    const entry = areaMap.get(area.id)!;
    return {
      name: area.name,
      products: entry.products.slice().sort((a, b) => a.description.localeCompare(b.description)),
    };
  });

  const buffer = await renderToBuffer(
    (
      <CountSheetDocument
        locationName={location.name}
        yellowDogCode={location.yellow_dog_code}
        eventName={event.name}
        eventDate={event.event_date}
        leadName={(assignment as any)?.location_lead?.name ?? null}
        estTickets={event.est_tickets}
        areas={areas}
      />
    ) as any
  );

  const filenameSafeLocation = location.name.replace(/[^a-zA-Z0-9]+/g, "-");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="count-sheet-${filenameSafeLocation}.pdf"`,
    },
  });
}

import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { sortStorageAreas } from "@/lib/storageAreas";
import { CountSheetDocument } from "@/lib/pdf/CountSheetDocument";
import { exportFilename } from "@/lib/exportFilename";
import { effectiveCount } from "@/lib/staffing";
import { checkinQrDataUri } from "@/lib/checkinQr";
import type { LocationStaffRole, LocationStaffTier } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event");
  const locationId = searchParams.get("location");
  if (!locationId) return new Response("Missing location", { status: 400 });

  const supabase = createClient();

  const [{ data: event }, { data: location }, { data: assignment }, { data: locationProducts }, { data: staffRoles }, { data: staffTiers }] =
    await Promise.all([
      eventId ? supabase.from("events").select("id, name, event_date, est_tickets").eq("id", eventId).single() : Promise.resolve({ data: null }),
      supabase.from("locations").select("id, name, type, yellow_dog_code, backup_lead_user_id").eq("id", locationId).single(),
      eventId
        ? supabase
            .from("event_location_assignments")
            .select("location_lead:profiles(name)")
            .eq("event_id", eventId)
            .eq("location_id", locationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("location_products")
        .select("product:products(sku, description, active), storage_area:storage_areas(id, code, name)")
        .eq("location_id", locationId)
        .eq("active", true),
      supabase.from("location_staff_roles").select("*").eq("location_id", locationId),
      supabase.from("location_staff_tiers").select("*").eq("location_id", locationId),
    ]);

  if (!location) return new Response("Not found", { status: 404 });
  if (eventId && !event) return new Response("Not found", { status: 404 });

  // Same access rule as /count: managers see any location, a stand lead
  // only the location(s) they're assigned to for this event. A location-only
  // (no event) blank template is a management action, not something a
  // stand lead needs.
  const isManager = ["admin", "warehouse", "kitchen", "catering"].includes(profile.role);
  if (!isManager && location.backup_lead_user_id !== profile.id) {
    if (!eventId) return new Response("Forbidden", { status: 403 });
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

  // Confirmed team for the Lead's reference -- the same tier-driven
  // calculation the dashboard's WFM Shifts numbers use, scoped to just
  // this location. Only meaningful once an event/attendance is known.
  const roles: { name: string; count: number }[] = [];
  if (event) {
    if (location.type === "stand") roles.push({ name: "Stand Lead", count: 1 });
    for (const role of (staffRoles as LocationStaffRole[] | null) ?? []) {
      const { count } = effectiveCount(role, (staffTiers as LocationStaffTier[] | null) ?? [], event.est_tickets);
      if (count > 0) roles.push({ name: role.role_name, count });
    }
  }

  const { origin } = new URL(request.url);
  const qrCodeDataUri = await checkinQrDataUri(origin, locationId);

  const buffer = await renderToBuffer(
    (
      <CountSheetDocument
        locationName={location.name}
        yellowDogCode={location.yellow_dog_code}
        eventName={event?.name ?? null}
        eventDate={event?.event_date ?? null}
        leadName={(assignment as any)?.location_lead?.name ?? null}
        estTickets={event?.est_tickets ?? null}
        roles={roles}
        areas={areas}
        qrCodeDataUri={qrCodeDataUri}
      />
    ) as any
  );

  const filenameSafeLocation = location.name.replace(/[^a-zA-Z0-9]+/g, "-");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename(`Count-Sheet-${filenameSafeLocation}`, "pdf")}"`,
    },
  });
}

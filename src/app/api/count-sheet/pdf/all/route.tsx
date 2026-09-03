import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { sortStorageAreas } from "@/lib/storageAreas";
import { AllCountSheetsDocument } from "@/lib/pdf/CountSheetDocument";
import { exportFilename } from "@/lib/exportFilename";
import { effectiveCount } from "@/lib/staffing";
import { checkinQrDataUri } from "@/lib/checkinQr";
import type { LocationStaffRole, LocationStaffTier } from "@/lib/supabase/types";

// One combined download for handing out at staff check-in -- every open
// stand's count sheet, in one PDF, instead of a manager downloading each
// location's sheet one at a time from its own page.
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });
  const isManager = ["admin", "warehouse", "kitchen", "catering"].includes(profile.role);
  if (!isManager) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event");
  if (!eventId) return new Response("Missing event", { status: 400 });

  const supabase = createClient();

  const [{ data: event }, { data: locations }, { data: eventLocations }] = await Promise.all([
    supabase.from("events").select("id, name, event_date, est_tickets").eq("id", eventId).single(),
    supabase.from("locations").select("id, name, type, yellow_dog_code").eq("active", true).eq("type", "stand").order("name"),
    supabase.from("event_locations").select("location_id, is_open").eq("event_id", eventId),
  ]);

  if (!event) return new Response("Not found", { status: 404 });

  const openByLocationId = new Map(((eventLocations as any[]) ?? []).map((el) => [el.location_id, el.is_open]));
  const openLocations = ((locations as any[]) ?? []).filter((l) => openByLocationId.get(l.id) ?? true);

  if (!openLocations.length) return new Response("No open locations for this event", { status: 404 });

  const locationIds = openLocations.map((l) => l.id);

  const [{ data: assignments }, { data: locationProducts }, { data: staffRoles }, { data: staffTiers }] = await Promise.all([
    supabase
      .from("event_location_assignments")
      .select("location_id, location_lead:profiles(name)")
      .eq("event_id", eventId)
      .in("location_id", locationIds),
    supabase
      .from("location_products")
      .select("location_id, product:products(sku, description, active), storage_area:storage_areas(id, code, name)")
      .in("location_id", locationIds)
      .eq("active", true),
    supabase.from("location_staff_roles").select("*").in("location_id", locationIds),
    supabase.from("location_staff_tiers").select("*").in("location_id", locationIds),
  ]);

  const leadNameByLocationId = new Map(((assignments as any[]) ?? []).map((a) => [a.location_id, a.location_lead?.name ?? null]));

  const areaMapByLocationId = new Map<
    string,
    Map<string, { area: { id: string; code: string; name: string }; products: { sku: string; description: string }[] }>
  >();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const areaMap = areaMapByLocationId.get(row.location_id) ?? new Map();
    const entry = areaMap.get(row.storage_area.id) ?? { area: row.storage_area, products: [] as { sku: string; description: string }[] };
    entry.products.push(row.product);
    areaMap.set(row.storage_area.id, entry);
    areaMapByLocationId.set(row.location_id, areaMap);
  }

  const rolesByLocationId = new Map<string, LocationStaffRole[]>();
  for (const role of (staffRoles as LocationStaffRole[] | null) ?? []) {
    const list = rolesByLocationId.get(role.location_id) ?? [];
    list.push(role);
    rolesByLocationId.set(role.location_id, list);
  }
  const tiers = (staffTiers as LocationStaffTier[] | null) ?? [];

  const { origin } = new URL(request.url);

  const locationPages = await Promise.all(
    openLocations.map(async (location) => {
      const areaMap = areaMapByLocationId.get(location.id) ?? new Map();
      const areas = sortStorageAreas(Array.from(areaMap.values()).map((e: any) => e.area)).map((area) => {
        const entry = areaMap.get(area.id)!;
        return {
          name: area.name,
          products: entry.products.slice().sort((a: any, b: any) => a.description.localeCompare(b.description)),
        };
      });

      const roles: { name: string; count: number }[] = [{ name: "Stand Lead", count: 1 }];
      for (const role of rolesByLocationId.get(location.id) ?? []) {
        const { count } = effectiveCount(role, tiers, event.est_tickets);
        if (count > 0) roles.push({ name: role.role_name, count });
      }

      return {
        locationName: location.name,
        yellowDogCode: location.yellow_dog_code,
        eventName: event.name,
        eventDate: event.event_date,
        leadName: leadNameByLocationId.get(location.id) ?? null,
        estTickets: event.est_tickets,
        roles,
        areas,
        qrCodeDataUri: await checkinQrDataUri(origin, location.id),
      };
    })
  );

  const buffer = await renderToBuffer((<AllCountSheetsDocument locations={locationPages} />) as any);

  const filenameSafeEvent = event.name.replace(/[^a-zA-Z0-9]+/g, "-");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename(`Count-Sheets-All-${filenameSafeEvent}`, "pdf")}"`,
    },
  });
}

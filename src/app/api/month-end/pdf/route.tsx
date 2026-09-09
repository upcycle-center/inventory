import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { sortStorageAreas } from "@/lib/storageAreas";
import { MonthEndCountSheetDocument } from "@/lib/pdf/MonthEndCountSheetDocument";
import { monthEndCountSheetFilename } from "@/lib/exportFilename";
import { easternDateString } from "@/lib/easternTime";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location");
  if (!locationId) return new Response("Missing location", { status: 400 });

  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.get("year") || defaultYear);
  const month = Number(searchParams.get("month") || defaultMonth);

  const supabase = createClient();

  const { data: location } = await supabase
    .from("locations")
    .select("id, name, yellow_dog_code, backup_lead_user_id")
    .eq("id", locationId)
    .single();
  if (!location) return new Response("Not found", { status: 404 });

  const isManager = profile.role !== "stand_lead";
  if (!isManager && location.backup_lead_user_id !== profile.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: locationProducts } = await supabase
    .from("location_products")
    .select("product:products(sku, description, active), storage_area:storage_areas(id, code, name)")
    .eq("location_id", locationId)
    .eq("active", true);

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

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const buffer = await renderToBuffer(
    (
      <MonthEndCountSheetDocument
        locationName={location.name}
        yellowDogCode={location.yellow_dog_code}
        monthLabel={monthLabel}
        areas={areas}
      />
    ) as any
  );

  const filename = monthEndCountSheetFilename({ yellowDogCode: location.yellow_dog_code, locationName: location.name, year, month });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

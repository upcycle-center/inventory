import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { sortStorageAreas } from "@/lib/storageAreas";
import { AllMonthEndCountSheetsDocument } from "@/lib/pdf/MonthEndCountSheetDocument";
import { exportFilename } from "@/lib/exportFilename";
import { easternDateString } from "@/lib/easternTime";
import { checkinQrDataUri } from "@/lib/checkinQr";

// One combined blank Month-End Count Sheet covering every active
// location, each grouped by Storage Area (alphabetical, Other last) --
// for printing the whole venue's packet at once instead of downloading
// one location's sheet at a time from /month-end.
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.get("year") || defaultYear);
  const month = Number(searchParams.get("month") || defaultMonth);

  const supabase = createClient();

  const [{ data: locations }, { data: locationProducts }] = await Promise.all([
    supabase.from("locations").select("id, name, yellow_dog_code").eq("active", true).order("name"),
    supabase
      .from("location_products")
      .select(
        "location_id, product:products(sku, description, active, middle_unit_label, each_countable), storage_area:storage_areas(id, code, name)"
      )
      .eq("active", true),
  ]);

  const areaMapByLocationId = new Map<
    string,
    Map<string, { area: { id: string; code: string; name: string }; products: { sku: string; description: string; middle_unit_label?: string | null; each_countable?: boolean }[] }>
  >();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const areaMap = areaMapByLocationId.get(row.location_id) ?? new Map();
    const entry = areaMap.get(row.storage_area.id) ?? { area: row.storage_area, products: [] as any[] };
    entry.products.push(row.product);
    areaMap.set(row.storage_area.id, entry);
    areaMapByLocationId.set(row.location_id, areaMap);
  }

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const { origin } = new URL(request.url);

  const locationPages = (
    await Promise.all(
      ((locations as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? []).map(async (location) => {
        const areaMap = areaMapByLocationId.get(location.id);
        if (!areaMap || !areaMap.size) return null;
        const areas = sortStorageAreas(Array.from(areaMap.values()).map((e) => e.area)).map((area) => {
          const entry = areaMap.get(area.id)!;
          return {
            name: area.name,
            products: entry.products.slice().sort((a, b) => a.description.localeCompare(b.description)),
          };
        });
        return {
          locationName: location.name,
          yellowDogCode: location.yellow_dog_code,
          areas,
          qrCodeDataUri: await checkinQrDataUri(origin, location.id),
        };
      })
    )
  ).filter((l): l is NonNullable<typeof l> => l !== null);

  if (!locationPages.length) return new Response("No products assigned to any active location", { status: 404 });

  const buffer = await renderToBuffer((<AllMonthEndCountSheetsDocument monthLabel={monthLabel} locations={locationPages} />) as any);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename("moEND-Count-Sheet-All-Locations", "pdf")}"`,
    },
  });
}

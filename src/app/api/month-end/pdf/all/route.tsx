import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PRODUCT_TYPE_OPTIONS, middleUnitColumnLabel } from "@/lib/productType";
import { AllMonthEndCountSheetsDocument } from "@/lib/pdf/MonthEndCountSheetDocument";
import { exportFilename } from "@/lib/exportFilename";
import { easternDateString } from "@/lib/easternTime";
import { checkinQrDataUri } from "@/lib/checkinQr";

// One combined blank Month-End Count Sheet covering every active
// location, each grouped by Product Type (Chargeable, Non-Chargeable --
// Bottles, Non-Chargeable -- Mixers, Disposables/Cleaning) then
// alphabetically -- same grouping as the Blank sheet, for consistency,
// instead of downloading one location's sheet at a time from /month-end.
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
        "location_id, product:products(sku, description, active, middle_unit_label, each_countable, product_type), storage_area:storage_areas(id)"
      )
      .eq("active", true),
  ]);

  const typeMapByLocationId = new Map<
    string,
    Map<string, { sku: string; description: string; middle_unit_label?: string | null; each_countable?: boolean }[]>
  >();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const typeMap = typeMapByLocationId.get(row.location_id) ?? new Map();
    const products = typeMap.get(row.product.product_type) ?? [];
    products.push(row.product);
    typeMap.set(row.product.product_type, products);
    typeMapByLocationId.set(row.location_id, typeMap);
  }

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const { origin } = new URL(request.url);

  const locationPages = (
    await Promise.all(
      ((locations as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? []).map(async (location) => {
        const typeMap = typeMapByLocationId.get(location.id);
        if (!typeMap || !typeMap.size) return null;
        const typeGroups = PRODUCT_TYPE_OPTIONS.map((t) => {
          const products = typeMap.get(t.value);
          if (!products?.length) return null;
          return {
            name: t.shortLabel,
            middleUnitLabel: middleUnitColumnLabel(t.value),
            products: products.slice().sort((a, b) => a.description.localeCompare(b.description)),
          };
        }).filter((g): g is NonNullable<typeof g> => g !== null);
        if (!typeGroups.length) return null;
        return {
          locationName: location.name,
          yellowDogCode: location.yellow_dog_code,
          typeGroups,
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

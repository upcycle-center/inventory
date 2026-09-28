import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { sortCategoryGroups } from "@/lib/productCategories";
import { AllMonthEndCountSheetsDocument } from "@/lib/pdf/MonthEndCountSheetDocument";
import { exportFilename } from "@/lib/exportFilename";
import { easternDateString } from "@/lib/easternTime";

const UNCATEGORIZED = { id: "uncategorized", name: "Uncategorized" };

// One combined blank Month-End Count Sheet covering every active
// location, each grouped by Category (alphabetical, Uncategorized last)
// -- for printing the whole venue's packet at once instead of
// downloading one location's sheet at a time from /month-end.
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
        "location_id, product:products(sku, description, active, middle_unit_label, each_countable, category_id, category:product_categories(id, name)), storage_area:storage_areas(id)"
      )
      .eq("active", true),
  ]);

  const categoryMapByLocationId = new Map<
    string,
    Map<string, { name: string; products: { sku: string; description: string; middle_unit_label?: string | null; each_countable?: boolean }[] }>
  >();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const categoryMap = categoryMapByLocationId.get(row.location_id) ?? new Map();
    const categoryId = row.product.category_id ?? UNCATEGORIZED.id;
    const categoryName = row.product.category?.name ?? UNCATEGORIZED.name;
    const entry = categoryMap.get(categoryId) ?? { name: categoryName, products: [] as any[] };
    entry.products.push(row.product);
    categoryMap.set(categoryId, entry);
    categoryMapByLocationId.set(row.location_id, categoryMap);
  }

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const locationPages = ((locations as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? [])
    .map((location) => {
      const categoryMap = categoryMapByLocationId.get(location.id);
      if (!categoryMap || !categoryMap.size) return null;
      const categories = sortCategoryGroups(Array.from(categoryMap.entries()).map(([id, e]) => ({ id, ...e }))).map((c) => ({
        name: c.name,
        products: c.products.slice().sort((a, b) => a.description.localeCompare(b.description)),
      }));
      return { locationName: location.name, yellowDogCode: location.yellow_dog_code, categories };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  if (!locationPages.length) return new Response("No products assigned to any active location", { status: 404 });

  const buffer = await renderToBuffer((<AllMonthEndCountSheetsDocument monthLabel={monthLabel} locations={locationPages} />) as any);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename("moEND-Count-Sheet-All-Locations", "pdf")}"`,
    },
  });
}

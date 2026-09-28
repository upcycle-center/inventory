import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { sortCategoryGroups } from "@/lib/productCategories";
import { MonthEndCountSheetDocument } from "@/lib/pdf/MonthEndCountSheetDocument";
import { monthEndCountSheetFilename } from "@/lib/exportFilename";
import { easternDateString } from "@/lib/easternTime";

const UNCATEGORIZED = { id: "uncategorized", name: "Uncategorized" };

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("location");
  if (!locationId) return new Response("Missing location", { status: 400 });
  const categoryFilter = searchParams.get("category");
  const vendorFilter = searchParams.get("vendor");
  const storageAreaFilter = searchParams.get("storage_area");

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
    .select(
      "product:products(sku, description, active, middle_unit_label, each_countable, category_id, category:product_categories(id, name), supplier_id), storage_area:storage_areas(id)"
    )
    .eq("location_id", locationId)
    .eq("active", true);

  const categoryMap = new Map<
    string,
    { name: string; products: { sku: string; description: string; middle_unit_label?: string | null; each_countable?: boolean }[] }
  >();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    if (categoryFilter && (row.product.category_id ?? UNCATEGORIZED.id) !== categoryFilter) continue;
    if (vendorFilter && (row.product.supplier_id ?? "no_vendor") !== vendorFilter) continue;
    if (storageAreaFilter && row.storage_area.id !== storageAreaFilter) continue;

    const categoryId = row.product.category_id ?? UNCATEGORIZED.id;
    const categoryName = row.product.category?.name ?? UNCATEGORIZED.name;
    const entry = categoryMap.get(categoryId) ?? { name: categoryName, products: [] as any[] };
    entry.products.push(row.product);
    categoryMap.set(categoryId, entry);
  }
  const categories = sortCategoryGroups(Array.from(categoryMap.entries()).map(([id, e]) => ({ id, ...e }))).map((c) => ({
    name: c.name,
    products: c.products.slice().sort((a, b) => a.description.localeCompare(b.description)),
  }));

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const buffer = await renderToBuffer(
    (
      <MonthEndCountSheetDocument
        locationName={location.name}
        yellowDogCode={location.yellow_dog_code}
        monthLabel={monthLabel}
        categories={categories}
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

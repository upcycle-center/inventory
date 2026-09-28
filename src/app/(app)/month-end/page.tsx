import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { sortCategoryGroups } from "@/lib/productCategories";
import { easternDateString } from "@/lib/easternTime";
import { MonthEndForm, type CategoryGroup } from "./MonthEndForm";

const UNCATEGORIZED = { id: "uncategorized", name: "Uncategorized" };
const NO_VENDOR = { id: "no_vendor", name: "No Vendor" };

export default async function MonthEndPage() {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const [{ data: locations }, { data: locationProducts }] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase
      .from("location_products")
      .select(
        "location_id, product:products(id, sku, description, photo_url, active, case_size, middle_unit_label, each_countable, category_id, category:product_categories(id, name), supplier_id, supplier:suppliers(id, name)), storage_area:storage_areas(id, code, name)"
      )
      .eq("active", true),
  ]);

  const categoriesByLocation = new Map<string, Map<string, CategoryGroup>>();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const catMap = categoriesByLocation.get(row.location_id) ?? new Map<string, CategoryGroup>();
    const categoryId = row.product.category_id ?? UNCATEGORIZED.id;
    const categoryName = row.product.category?.name ?? UNCATEGORIZED.name;
    const group: CategoryGroup = catMap.get(categoryId) ?? { id: categoryId, name: categoryName, products: [] };
    group.products.push({
      id: row.product.id,
      sku: row.product.sku,
      description: row.product.description,
      photo_url: row.product.photo_url,
      case_size: row.product.case_size,
      middle_unit_label: row.product.middle_unit_label,
      each_countable: row.product.each_countable,
      supplier_id: row.product.supplier_id ?? NO_VENDOR.id,
      supplier_name: row.product.supplier?.name ?? NO_VENDOR.name,
      storage_area_id: row.storage_area.id,
      storage_area_name: row.storage_area.name,
    });
    catMap.set(categoryId, group);
    categoriesByLocation.set(row.location_id, catMap);
  }

  const productsByLocation: Record<string, CategoryGroup[]> = {};
  for (const [locationId, catMap] of categoriesByLocation) {
    productsByLocation[locationId] = sortCategoryGroups(Array.from(catMap.values())).map((g) => ({
      ...g,
      products: g.products.slice().sort((a, b) => a.description.localeCompare(b.description)),
    }));
  }

  const [currentYear, currentMonth] = easternDateString().split("-").map(Number);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Month-End Count" }]} />
      <h1 className="mb-2 text-lg font-semibold">Month-End Count Sheet</h1>
      <p className="mb-6 text-sm text-gray-500">
        A full physical count for one location, posted as that month&apos;s authoritative moEND —
        the same figure an admin would otherwise type in product-by-product under Admin → Locations.
        Found something on the shelf that isn&apos;t in the system? Add it under &ldquo;New /
        unlisted items&rdquo; below instead of skipping it — it&apos;s reported to a YellowDog
        manager to add to the catalog.
      </p>
      <MonthEndForm
        locations={locations ?? []}
        productsByLocation={productsByLocation}
        defaultYear={currentYear}
        defaultMonth={currentMonth}
      />
    </div>
  );
}

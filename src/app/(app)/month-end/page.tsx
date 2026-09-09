import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { sortStorageAreas } from "@/lib/storageAreas";
import { easternDateString } from "@/lib/easternTime";
import { MonthEndForm, type StorageAreaGroup } from "./MonthEndForm";

export default async function MonthEndPage() {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const [{ data: locations }, { data: locationProducts }] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase
      .from("location_products")
      .select(
        "location_id, product:products(id, sku, description, photo_url, active, case_size), storage_area:storage_areas(id, code, name)"
      )
      .eq("active", true),
  ]);

  const areasByLocation = new Map<string, Map<string, StorageAreaGroup>>();
  for (const row of (locationProducts as any[]) ?? []) {
    if (!row.product?.active || !row.storage_area) continue;
    const areaMap = areasByLocation.get(row.location_id) ?? new Map<string, StorageAreaGroup>();
    const area = areaMap.get(row.storage_area.id) ?? { ...row.storage_area, products: [] };
    area.products.push(row.product);
    areaMap.set(row.storage_area.id, area);
    areasByLocation.set(row.location_id, areaMap);
  }

  const productsByLocation: Record<string, StorageAreaGroup[]> = {};
  for (const [locationId, areaMap] of areasByLocation) {
    productsByLocation[locationId] = sortStorageAreas(Array.from(areaMap.values()));
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

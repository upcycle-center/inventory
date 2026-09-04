import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getDraft } from "@/lib/actionDrafts";
import { sortStorageAreas } from "@/lib/storageAreas";
import { RecoveryForm, type StorageAreaGroup } from "./RecoveryForm";

export default async function RecoveryPage({ searchParams }: { searchParams: { location?: string } }) {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const [{ data: locations }, { data: warehouses }, { data: locationProducts }, draft] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase.from("locations").select("*").eq("active", true).eq("type", "warehouse").order("name"),
    supabase
      .from("location_products")
      .select(
        "location_id, product:products(id, sku, description, photo_url, active, case_size), storage_area:storage_areas(id, code, name)"
      )
      .eq("active", true),
    getDraft(supabase, profile.id, "recovery"),
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

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Recovery" }]} />
      <h1 className="mb-2 text-lg font-semibold">Recover Stock to Warehouse</h1>
      <p className="mb-6 text-sm text-gray-500">
        Pull stock back from a location into a warehouse — the month/quarter/year-end process for
        clearing out stands that are closing for the season, so nothing sits exposed at a closed
        location.
      </p>
      <RecoveryForm
        locations={locations ?? []}
        warehouses={warehouses ?? []}
        productsByLocation={productsByLocation}
        initialValues={draft}
        initialFromLocationId={searchParams.location}
      />
    </div>
  );
}

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getDraft } from "@/lib/actionDrafts";
import { sortStorageAreas } from "@/lib/storageAreas";
import { RequestForm, type StorageAreaGroup } from "./RequestForm";

export default async function RequestPage({ searchParams }: { searchParams: { location?: string } }) {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering"]);
  const supabase = createClient();

  const [{ data: locations }, { data: locationProducts }, draft] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase
      .from("location_products")
      .select(
        "location_id, product:products(id, sku, description, photo_url, active, case_size), storage_area:storage_areas(id, code, name)"
      )
      .eq("active", true),
    getDraft(supabase, profile.id, "request"),
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
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Request" }]} />
      <h1 className="mb-2 text-lg font-semibold">Request Restock</h1>
      <p className="mb-6 text-sm text-gray-500">
        Pick a location, set case/each quantities for anything that needs restocking, then post — it
        lands in the RequestQ for Warehouse/Admin to fulfill.
      </p>
      <RequestForm
        locations={locations ?? []}
        productsByLocation={productsByLocation}
        initialValues={draft}
        initialLocationId={searchParams.location}
      />
    </div>
  );
}

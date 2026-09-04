import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getDraft } from "@/lib/actionDrafts";
import { sortStorageAreas } from "@/lib/storageAreas";
import { TransferForm, type StorageAreaGroup } from "./TransferForm";

export default async function TransferPage({ searchParams }: { searchParams: { location?: string } }) {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const [{ data: locations }, { data: locationProducts }, draft] = await Promise.all([
    supabase.from("locations").select("*").eq("active", true).order("name"),
    supabase
      .from("location_products")
      .select(
        "location_id, product:products(id, sku, description, photo_url, active, case_size), storage_area:storage_areas(id, code, name)"
      )
      .eq("active", true),
    getDraft(supabase, profile.id, "transfer"),
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
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Transfer" }]} />
      <h1 className="mb-2 text-lg font-semibold">Transfer Stock</h1>
      <p className="mb-6 text-sm text-gray-500">
        Move stock between two locations — pick where it&apos;s coming from and going to, then set
        case/each quantities for anything moving.
      </p>
      <TransferForm
        locations={locations ?? []}
        productsByLocation={productsByLocation}
        initialValues={draft}
        initialFromLocationId={searchParams.location}
      />
    </div>
  );
}

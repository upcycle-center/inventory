import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Location, ProductCategory, StorageArea, Supplier } from "@/lib/supabase/types";
import { sortStorageAreas } from "@/lib/storageAreas";
import { isProductTypeValue } from "@/lib/productType";
import { LocationLabel } from "@/components/LocationLabel";
import { createProduct } from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/ActionForm";
import { NewProductFields } from "./NewProductFields";
import { requireProfile } from "@/lib/auth";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: { from?: string; type?: string };
}) {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/admin/products");
  const supabase = createClient();

  const [{ data: suppliers }, { data: locations }, { data: storageAreas }, { data: categories }, fromProductResult, fromLocationProductsResult] =
    await Promise.all([
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("locations").select("*").eq("active", true).order("name"),
      supabase.from("storage_areas").select("*").eq("active", true),
      supabase.from("product_categories").select("*").order("name"),
      searchParams.from
        ? supabase.from("products").select("*").eq("id", searchParams.from).single()
        : Promise.resolve({ data: null }),
      searchParams.from
        ? supabase.from("location_products").select("location_id, storage_area_id").eq("product_id", searchParams.from)
        : Promise.resolve({ data: [] as { location_id: string; storage_area_id: string }[] }),
    ]);

  const from = fromProductResult.data;
  const areas = sortStorageAreas((storageAreas as StorageArea[]) ?? []);
  const storageAreaIdByLocationId = new Map(
    (fromLocationProductsResult.data ?? []).map((lp) => [lp.location_id, lp.storage_area_id])
  );
  const defaultAreaId = areas.find((a) => a.code === "OTH")?.id ?? areas[0]?.id ?? "";
  const defaultProductType =
    from?.product_type ?? (searchParams.type && isProductTypeValue(searchParams.type) ? searchParams.type : "chargeable");

  // Non-Chargeable – Bottles (liquor/wine) always lives in the Liquor
  // Room's Dry Storage area with a reorder threshold of 12 -- pre-select
  // that here so the form shows the default before saving; createProduct
  // also enforces it server-side regardless of what's checked.
  const isNewNonChargeableBottle = !from && defaultProductType === "non_chargeable_bottle";
  const liquorRoomId = ((locations as Location[] | null) ?? []).find((l) => l.yellow_dog_code === "100")?.id;
  const dryStorageAreaId = areas.find((a) => a.code === "DRY")?.id ?? defaultAreaId;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: from ? "Duplicate" : "Add" },
        ]}
      />
      <h1 className="mb-1 text-lg font-semibold">{from ? "Duplicate product" : "Add product"}</h1>
      {from && (
        <p className="mb-6 text-sm text-gray-500">
          Copied from &ldquo;{from.description}&rdquo;. Give it a new IC (and UPC, if it has one)
          before saving.
        </p>
      )}

      <ActionForm
        action={createProduct}
        savedLabel="Saved"
        encType="multipart/form-data"
        className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <NewProductFields
          suppliers={(suppliers as Supplier[] | null) ?? []}
          categories={(categories as ProductCategory[] | null) ?? []}
          defaultProductType={defaultProductType}
          defaultDescription={from?.description}
          defaultSupplierId={from?.supplier_id}
          defaultBrand={from?.brand}
          defaultCategoryId={from?.category_id}
          defaultCaseCost={from?.case_cost}
          defaultSalePrice={from?.sale_price}
          defaultCaseSize={from?.case_size}
          defaultUnitOfMeasure={from?.unit_of_measure}
          defaultBottleSizeMl={from?.bottle_size_ml}
          defaultPourSizeOz={from?.pour_size_oz}
          defaultPourPrice={from?.pour_price}
          defaultMiddleUnitLabel={from?.middle_unit_label}
          defaultMiddleUnitSize={from?.middle_unit_size}
          defaultEachCountable={from?.each_countable ?? true}
          defaultPosSquare={from?.pos_square ?? false}
        />

        <label className="text-sm text-gray-600">
          Photo (for the count screen&apos;s photo grid)
          <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm" />
        </label>

        <div>
          <p className="mb-1 text-sm font-medium">Locations</p>
          <p className="mb-3 text-sm text-gray-500">
            {from
              ? "Pre-checked to match the source product — review and adjust before saving."
              : isNewNonChargeableBottle
                ? "Non-Chargeable – Bottles default to Liquor Room / Dry Storage with a reorder threshold of 12 — adjust under Admin → Locations after saving if needed."
                : "Every location is checked (stocked) by default. Uncheck a location if this product isn't stocked there."}
          </p>
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="pb-2">Stock</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Storage area</th>
              </tr>
            </thead>
            <tbody>
              {(locations as Location[] | null)?.map((l) => {
                const existingAreaId = storageAreaIdByLocationId.get(l.id);
                return (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        name={`sold_${l.id}`}
                        defaultChecked={
                          from
                            ? storageAreaIdByLocationId.has(l.id)
                            : isNewNonChargeableBottle
                              ? l.id === liquorRoomId
                              : true
                        }
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="py-2">
                      <LocationLabel location={l} />
                    </td>
                    <td className="py-2">
                      <select
                        name={`area_${l.id}`}
                        defaultValue={
                          existingAreaId ??
                          (isNewNonChargeableBottle && l.id === liquorRoomId ? dryStorageAreaId : defaultAreaId)
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {!locations?.length && (
                <tr>
                  <td colSpan={3} className="py-4 text-gray-400">
                    No locations available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Save
          </button>
          <Link href="/admin/products" className="w-fit rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
            Cancel
          </Link>
        </div>
      </ActionForm>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Location, StorageArea, Supplier } from "@/lib/supabase/types";
import { sortStorageAreas } from "@/lib/storageAreas";
import { LocationLabel } from "@/components/LocationLabel";
import { createProduct } from "../actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: { from?: string; type?: string };
}) {
  const supabase = createClient();

  const [{ data: suppliers }, { data: locations }, { data: storageAreas }, fromProductResult, fromLocationProductsResult] =
    await Promise.all([
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("locations").select("*").eq("active", true).order("name"),
      supabase.from("storage_areas").select("*").eq("active", true),
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
  const defaultProductType = from?.product_type ?? (searchParams.type === "consumable" ? "consumable" : "sellable");

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

      <form
        action={createProduct}
        encType="multipart/form-data"
        className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <label className="text-sm text-gray-600">
          IC (Internal Code)
          <input name="sku" required placeholder="Enter a new, unique code" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          UPC (optional)
          <input name="upc" placeholder="UPC (optional, if known)" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Description
          <input name="description" defaultValue={from?.description ?? ""} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Type
          <select name="product_type" defaultValue={defaultProductType} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="sellable">Sellable</option>
            <option value="consumable">Consumable (cups, napkins, koozies, etc.)</option>
          </select>
        </label>
        <label className="text-sm text-gray-600">
          Supplier
          <select name="supplier_id" defaultValue={from?.supplier_id ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">No supplier</option>
            {(suppliers as Supplier[] | null)?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Case cost
            <input name="case_cost" type="number" step="0.01" defaultValue={from?.case_cost ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Sale price (each)
            <input name="sale_price" type="number" step="0.01" defaultValue={from?.sale_price ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Case size (units per case)
            <input name="case_size" type="number" step="1" min={0} defaultValue={from?.case_size ?? ""} placeholder="e.g. 24" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Unit of measure
            <select name="unit_of_measure" defaultValue={from?.unit_of_measure ?? "each"} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="each">Each</option>
              <option value="case">Case</option>
            </select>
          </label>
        </div>
        <label className="text-sm text-gray-600">
          Photo (for the count screen&apos;s photo grid)
          <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm" />
        </label>

        <div>
          <p className="mb-1 text-sm font-medium">Locations</p>
          <p className="mb-3 text-sm text-gray-500">
            {from
              ? "Pre-checked to match the source product — review and adjust before saving."
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
                        defaultChecked={from ? storageAreaIdByLocationId.has(l.id) : true}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="py-2">
                      <LocationLabel location={l} />
                    </td>
                    <td className="py-2">
                      <select
                        name={`area_${l.id}`}
                        defaultValue={existingAreaId ?? defaultAreaId}
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
      </form>
    </div>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Product, StorageArea } from "@/lib/supabase/types";
import { sortStorageAreas } from "@/lib/storageAreas";
import { assignProductToLocation, removeProductFromLocation, updateLocation } from "./actions";

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: location }, { data: storageAreas }, { data: products }, { data: locationProducts }] =
    await Promise.all([
      supabase.from("locations").select("*").eq("id", params.id).single(),
      supabase.from("storage_areas").select("*").eq("active", true),
      supabase.from("products").select("*").eq("active", true).order("description"),
      supabase
        .from("location_products")
        .select("id, product_id, storage_area_id, product:products(id, sku, description), storage_area:storage_areas(id, code, name)")
        .eq("location_id", params.id),
    ]);

  if (!location) notFound();

  const areas = sortStorageAreas((storageAreas as StorageArea[]) ?? []);
  const assignments = (locationProducts as any[] | null) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">
        {location.yellow_dog_code && (
          <span className="mr-2 font-mono text-gray-400">{location.yellow_dog_code}</span>
        )}
        {location.name}
      </h1>

      <form
        action={updateLocation}
        className="mb-8 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <p className="text-sm font-medium">Location details</p>
        <input type="hidden" name="id" value={location.id} />
        <input name="name" defaultValue={location.name} required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="type" defaultValue={location.type} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="stand">Stand</option>
          <option value="kitchen">Kitchen</option>
          <option value="warehouse">Warehouse</option>
        </select>
        <input
          name="description"
          defaultValue={location.description ?? ""}
          placeholder="Description (optional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <label className="text-sm text-gray-600">
          YDC (Yellow Dog Code)
          <input
            name="yellow_dog_code"
            defaultValue={location.yellow_dog_code ?? ""}
            placeholder="000"
            maxLength={3}
            pattern="\d{3}"
            className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-sm"
          />
        </label>
        <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
          Save
        </button>
      </form>

      <p className="mb-6 text-sm text-gray-500">
        Assign which products live in each storage area for this location — this drives the
        photo-grid count screen.
      </p>

      <form
        action={assignProductToLocation}
        className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="location_id" value={location.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Product</label>
          <select name="product_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {(products as Product[] | null)?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.description} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Storage area</label>
          <select name="storage_area_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Assign
        </button>
      </form>

      {areas.map((area) => {
        const items = assignments.filter((a) => a.storage_area_id === area.id);
        if (!items.length) return null;
        return (
          <div key={area.id} className="mb-6">
            <p className="mb-2 text-sm font-medium">
              {area.code} — {area.name}
            </p>
            <ul className="space-y-1">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm"
                >
                  <span>
                    {a.product?.description} <span className="text-gray-400">({a.product?.sku})</span>
                  </span>
                  <form action={removeProductFromLocation}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="location_id" value={location.id} />
                    <button type="submit" className="text-red-600 hover:underline">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {!assignments.length && <p className="text-sm text-gray-400">No products assigned yet.</p>}
    </div>
  );
}

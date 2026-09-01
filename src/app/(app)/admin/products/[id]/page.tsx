import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Location, StorageArea, Supplier } from "@/lib/supabase/types";
import { sortStorageAreas } from "@/lib/storageAreas";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";
import { ActionForm } from "@/components/ActionForm";
import { assignProductToLocation, removeProductFromLocation, updateProduct } from "./actions";
import { toggleProductActive } from "../actions";
import { DeleteProductButton } from "./DeleteProductButton";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: product }, { data: suppliers }, { data: locations }, { data: storageAreas }, { data: locationProducts }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", params.id).single(),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("locations").select("*").eq("active", true).order("name"),
      supabase.from("storage_areas").select("*").eq("active", true),
      supabase
        .from("location_products")
        .select("id, location_id, storage_area_id, location:locations(id, name), storage_area:storage_areas(id, code, name)")
        .eq("product_id", params.id),
    ]);

  if (!product) notFound();

  const areas = sortStorageAreas((storageAreas as StorageArea[]) ?? []);
  const assignments = (locationProducts as any[] | null) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Edit product</h1>

      <ActionForm
        id="edit-product-form"
        action={updateProduct}
        encType="multipart/form-data"
        className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={product.id} />

        <div className="mb-1 flex aspect-square w-24 items-center justify-center overflow-hidden rounded bg-gray-100">
          {product.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.photo_url} alt={product.description} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ProductPlaceholderIcon />
            </div>
          )}
        </div>

        <label className="text-sm text-gray-600">
          IC (Internal Code)
          <input name="sku" defaultValue={product.sku} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          UPC (optional)
          <input name="upc" defaultValue={product.upc ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Description
          <input name="description" defaultValue={product.description} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Supplier
          <select name="supplier_id" defaultValue={product.supplier_id ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
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
            Unit cost
            <input name="unit_cost" type="number" step="0.01" defaultValue={product.unit_cost ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Unit of measure
            <select name="unit_of_measure" defaultValue={product.unit_of_measure} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="each">Each</option>
              <option value="case">Case</option>
            </select>
          </label>
        </div>
        <label className="text-sm text-gray-600">
          Case size (units per case)
          <input name="case_size" type="number" step="1" min={0} defaultValue={product.case_size ?? ""} placeholder="e.g. 24" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Replace photo
          <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm" />
        </label>
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" form="edit-product-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <Link
          href={`/admin/products/new?from=${product.id}`}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Duplicate
        </Link>
        <ActionForm action={toggleProductActive} className="contents" savedLabel={product.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="active" value={String(product.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {product.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <DeleteProductButton productId={product.id} />
      </div>

      <p className="mb-3 mt-8 text-sm font-medium">Locations</p>
      <p className="mb-6 text-sm text-gray-500">
        Assign which locations carry this product and the storage area it lives in there — this
        drives the photo-grid count screen.
      </p>

      <ActionForm
        action={assignProductToLocation}
        savedLabel="Assigned"
        className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="product_id" value={product.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Location</label>
          <select name="location_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {(locations as Location[] | null)?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Storage area</label>
          <select name="storage_area_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Assign
        </button>
      </ActionForm>

      <ul className="space-y-1">
        {assignments.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm"
          >
            <span>
              {a.location?.name} <span className="text-gray-400">({a.storage_area?.name})</span>
            </span>
            <form action={removeProductFromLocation}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="product_id" value={product.id} />
              <button type="submit" className="text-red-600 hover:underline">
                Remove
              </button>
            </form>
          </li>
        ))}
        {!assignments.length && <p className="text-sm text-gray-400">Not assigned to any location yet.</p>}
      </ul>
    </div>
  );
}

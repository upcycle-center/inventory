import { createClient } from "@/lib/supabase/server";
import type { Product, Supplier } from "@/lib/supabase/types";
import { createProduct, toggleProductActive } from "./actions";
import { CsvUploadForm } from "./CsvUploadForm";

export default async function AdminProductsPage() {
  const supabase = createClient();
  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase.from("products").select("*").order("description"),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Products</h1>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <form
          action={createProduct}
          encType="multipart/form-data"
          className="grid gap-3 rounded-md border border-gray-200 bg-white p-4"
        >
          <p className="text-sm font-medium">Add a product</p>
          <input name="sku" placeholder="IC (Internal Code)" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="upc" placeholder="UPC (optional, if known)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="description" placeholder="Description" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select name="supplier_id" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">No supplier</option>
            {(suppliers as Supplier[] | null)?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input name="unit_cost" type="number" step="0.01" placeholder="Unit cost" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="unit_of_measure" defaultValue="each" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="each">Each</option>
              <option value="case">Case</option>
            </select>
          </div>
          <label className="text-sm text-gray-600">
            Case size (units per case)
            <input name="case_size" type="number" step="1" min={0} placeholder="e.g. 24" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Photo (for the count screen&apos;s photo grid)
            <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm" />
          </label>
          <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
            Add product
          </button>
        </form>

        <CsvUploadForm suppliers={(suppliers as Supplier[] | null) ?? []} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(products as Product[] | null)?.map((p) => (
          <div key={p.id} className="rounded-md border border-gray-200 bg-white p-3">
            <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded bg-gray-100">
              {p.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photo_url} alt={p.description} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400">No photo</span>
              )}
            </div>
            <p className="text-sm font-medium">{p.description}</p>
            <p className="text-xs text-gray-500">
              {p.sku} · {p.unit_of_measure}
              {p.case_size ? ` · case of ${p.case_size}` : ""}
              {!p.active && " · inactive"}
            </p>
            {p.upc && <p className="text-xs text-gray-400">UPC {p.upc}</p>}
            <form action={toggleProductActive} className="mt-2">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="active" value={String(p.active)} />
              <button type="submit" className="text-xs text-brand hover:underline">
                {p.active ? "Deactivate" : "Reactivate"}
              </button>
            </form>
          </div>
        ))}
        {!products?.length && <p className="col-span-full text-sm text-gray-400">No products yet.</p>}
      </div>
    </div>
  );
}

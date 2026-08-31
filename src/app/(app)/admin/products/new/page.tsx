import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { createProduct } from "../actions";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = createClient();

  const [{ data: suppliers }, fromProductResult] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    searchParams.from
      ? supabase.from("products").select("*").eq("id", searchParams.from).single()
      : Promise.resolve({ data: null }),
  ]);

  const from = fromProductResult.data;

  return (
    <div>
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
            Unit cost
            <input name="unit_cost" type="number" step="0.01" defaultValue={from?.unit_cost ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
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
          Case size (units per case)
          <input name="case_size" type="number" step="1" min={0} defaultValue={from?.case_size ?? ""} placeholder="e.g. 24" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Photo (for the count screen&apos;s photo grid)
          <input name="photo" type="file" accept="image/*" className="mt-1 block w-full text-sm" />
        </label>
        <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
          {from ? "Save as new product" : "Add product"}
        </button>
      </form>
    </div>
  );
}

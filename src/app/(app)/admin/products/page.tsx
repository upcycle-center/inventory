import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { createProduct } from "./actions";
import { CsvUploadForm } from "./CsvUploadForm";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";
import { ActionForm } from "@/components/ActionForm";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; supplier?: string; unit?: string };
}) {
  const supabase = createClient();
  const { q, supplier, unit } = searchParams;

  let query = supabase
    .from("products")
    .select("*, supplier:suppliers(id, name)")
    .eq("active", true)
    .order("description");

  if (q) {
    const term = q.trim();
    query = query.or(`description.ilike.%${term}%,sku.ilike.%${term}%,upc.ilike.%${term}%`);
  }
  if (supplier) query = query.eq("supplier_id", supplier);
  if (unit) query = query.eq("unit_of_measure", unit);

  const [{ data: products }, { data: suppliers }] = await Promise.all([
    query,
    supabase.from("suppliers").select("*").order("name"),
  ]);

  const supplierList = (suppliers as Supplier[] | null) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Products</h1>
        <Link href="/admin/products/inactive" className="text-sm text-brand hover:underline">
          View inactive
        </Link>
      </div>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <ActionForm
          action={createProduct}
          encType="multipart/form-data"
          savedLabel="Product added"
          className="grid gap-3 rounded-md border border-gray-200 bg-white p-4"
        >
          <p className="text-sm font-medium">Add a product</p>
          <input name="sku" placeholder="IC (Internal Code)" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="upc" placeholder="UPC (optional, if known)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="description" placeholder="Description" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select name="supplier_id" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">No supplier</option>
            {supplierList.map((s) => (
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
          <button type="submit" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Save
          </button>
        </ActionForm>

        <CsvUploadForm suppliers={supplierList} />
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
        <label className="text-xs text-gray-500">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Description, IC, or UPC"
            className="mt-1 w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Supplier
          <select name="supplier" defaultValue={supplier ?? ""} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">All</option>
            {supplierList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-500">
          Unit
          <select name="unit" defaultValue={unit ?? ""} className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">All</option>
            <option value="each">Each</option>
            <option value="case">Case</option>
          </select>
        </label>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Filter
        </button>
        {(q || supplier || unit) && (
          <Link href="/admin/products" className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">IC</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {(products as any[] | null)?.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.description} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ProductPlaceholderIcon />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-500">{p.sku}</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-brand hover:underline">
                    {p.description}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {p.unit_of_measure === "case" && p.case_size
                    ? `Case of ${p.case_size}`
                    : p.case_size
                      ? `${p.unit_of_measure} · ${p.case_size}/case`
                      : p.unit_of_measure}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/products/new?from=${p.id}`} className="text-xs font-medium text-amber-600 hover:underline">
                    Duplicate
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500">{p.supplier?.name ?? "—"}</td>
              </tr>
            ))}
            {!products?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No products match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { PRODUCT_TYPE_OPTIONS, isProductTypeValue } from "@/lib/productType";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";
import { CaseSizeLabel } from "@/components/CaseSizeLabel";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; supplier?: string; unit?: string; type?: string };
}) {
  const supabase = createClient();
  const { q, supplier, unit } = searchParams;
  const type = searchParams.type && isProductTypeValue(searchParams.type) ? searchParams.type : "chargeable";

  let query = supabase
    .from("products")
    .select("*, supplier:suppliers(id, name)")
    .eq("active", true)
    .eq("product_type", type)
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
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Products" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Products</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/products/bulk-upload" className="text-sm text-brand hover:underline">
            Bulk upload from CSV
          </Link>
          <Link href="/admin/products/cost-log" className="text-sm text-brand hover:underline">
            Cost variance log
          </Link>
          <Link href="/admin/products/inactive" className="text-sm text-brand hover:underline">
            View inactive
          </Link>
          <Link href={`/admin/products/new?type=${type}`} className="rounded-md bg-brand px-4 py-2 text-sm text-white">
            Add product
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200">
        {PRODUCT_TYPE_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={`/admin/products?type=${opt.value}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              type === opt.value ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {opt.shortLabel}
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
        <input type="hidden" name="type" value={type} />
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
          <Link href={`/admin/products?type=${type}`} className="text-sm text-gray-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2 whitespace-nowrap">IC</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 whitespace-nowrap"><span className="sr-only">Case Size</span></th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2 whitespace-nowrap">Supplier</th>
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
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{p.sku}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-brand hover:underline">
                    {p.description}
                  </Link>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                  <CaseSizeLabel product={p} />
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <Link
                    href={`/admin/products/new?from=${p.id}`}
                    aria-label="Duplicate"
                    title="Duplicate"
                    className="inline-flex items-center text-amber-600 hover:text-amber-700"
                  >
                    <DuplicateIcon />
                  </Link>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{p.supplier?.name ?? "—"}</td>
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

function DuplicateIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 10.5h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductPlaceholderIcon } from "@/components/ProductPlaceholderIcon";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { toggleProductActive } from "../actions";

export default async function InactiveProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*, supplier:suppliers(id, name)")
    .eq("active", false)
    .order("description");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "Inactive" },
        ]}
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inactive products</h1>
        <Link href="/admin/products" className="text-sm text-brand hover:underline">
          Back to products
        </Link>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">IC</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2"></th>
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
                <td className="px-4 py-2 text-gray-500 capitalize">{p.product_type}</td>
                <td className="px-4 py-2 text-gray-500">
                  {p.unit_of_measure === "case" && p.case_size
                    ? `Case of ${p.case_size}`
                    : p.case_size
                      ? `${p.unit_of_measure} · ${p.case_size}/case`
                      : p.unit_of_measure}
                </td>
                <td className="px-4 py-2 text-gray-500">{p.supplier?.name ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleProductActive}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={String(p.active)} />
                    <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">
                      Reactivate
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!products?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No inactive products.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

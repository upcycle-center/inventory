import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Product } from "@/lib/supabase/types";

export default async function SquarePosMappingPage() {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, sku, description, product_type")
    .eq("pos_square", true)
    .eq("active", true)
    .order("description");

  const rows = (products as Pick<Product, "id" | "sku" | "description" | "product_type">[] | null) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Square POS" }]} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Square POS Mapping</h1>
          <p className="mt-1 text-sm text-gray-500">
            Products with the &ldquo;POS Square&rdquo; checkbox checked on their Product Details page —
            these are what go out in the Square data map export.
          </p>
        </div>
        <a
          href="/api/products/square-pos-export"
          className="rounded-md bg-brand px-4 py-2 text-sm text-white"
        >
          Download data map (CSV)
        </a>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2 whitespace-nowrap">IC</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 whitespace-nowrap">Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{p.sku}</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-brand hover:underline">
                    {p.description}
                  </Link>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{p.product_type}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No products are checked for POS Square yet — check the box on a Product Details page
                  to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

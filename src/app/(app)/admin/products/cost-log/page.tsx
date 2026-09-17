import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { easternDateTimeString } from "@/lib/easternTime";

const SOURCE_LABEL: Record<string, string> = {
  manual_edit: "Manual edit",
  csv_upload: "CSV upload",
};

export default async function ProductCostLogPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("product_cost_log")
    .select(
      "id, previous_cost, new_cost, variance, variance_pct, source, created_at, product:products(id, sku, description), changed_by_profile:profiles(id, name)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data as any[] | null) ?? [];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "Cost Variance Log" },
        ]}
      />
      <h1 className="mb-2 text-lg font-semibold">Cost Variance Log</h1>
      <p className="mb-6 text-sm text-gray-500">
        Every time a product&apos;s Case Cost changes — from the Product page or a CSV upload — it&apos;s
        logged here against what it was before, so a price that came in different from what&apos;s on
        file is easy to spot.
      </p>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 text-right">Previous Cost</th>
              <th className="px-4 py-2 text-right">New Cost</th>
              <th className="px-4 py-2 text-right">Variance</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Changed By</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const increased = r.variance != null && r.variance > 0;
              const decreased = r.variance != null && r.variance < 0;
              return (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    {r.product ? (
                      <Link href={`/admin/products/${r.product.id}`} className="text-brand hover:underline">
                        {r.product.description}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <span className="ml-2 text-xs text-gray-400">{r.product?.sku}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {r.previous_cost != null ? `$${Number(r.previous_cost).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">${Number(r.new_cost).toFixed(2)}</td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      increased ? "text-red-600" : decreased ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {r.variance != null
                      ? `${increased ? "+" : ""}$${Number(r.variance).toFixed(2)}${
                          r.variance_pct != null ? ` (${increased ? "+" : ""}${Number(r.variance_pct).toFixed(1)}%)` : ""
                        }`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{SOURCE_LABEL[r.source] ?? r.source}</td>
                  <td className="px-4 py-2 text-gray-500">{r.changed_by_profile?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-gray-400">{easternDateTimeString(new Date(r.created_at))}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No cost changes logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

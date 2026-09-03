import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LocationLabel } from "@/components/LocationLabel";
import { lineValue } from "@/lib/inventoryValue";

function fmtCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

export default async function RecoveriesReportPage() {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const { data: recoveries } = await supabase
    .from("inventory_movements")
    .select(
      "id, quantity, qty_cases, qty_each, created_at, product:products(sku, description, case_cost, case_size), from_location:locations!inventory_movements_from_location_id_fkey(id, name, yellow_dog_code), to_location:locations!inventory_movements_to_location_id_fkey(id, name, yellow_dog_code), user:profiles(name)"
    )
    .eq("type", "recovery")
    .order("created_at", { ascending: false });

  const rows = (recoveries as any[]) ?? [];
  const totalQty = rows.reduce((sum, r) => sum + Number(r.quantity), 0);
  const totalValue = rows.reduce((sum, r) => sum + (r.product ? lineValue(r.qty_each, r.qty_cases, r.product) : 0), 0);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Recoveries" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Recoveries</h1>
        {!!rows.length && (
          <Link href="/api/recoveries/export" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
            Download CSV
          </Link>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Stock recovered from a location back to a warehouse, most recent first — the
        month/quarter/year-end stand-closeout process.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-lg">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-2xl font-semibold">{totalQty.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total recovered (EA)</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="text-2xl font-semibold">{fmtCurrency(totalValue)}</p>
          <p className="text-sm text-gray-500">Total recovered ($, cost basis)</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Logged by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">{r.from_location && <LocationLabel location={r.from_location} />}</td>
                <td className="px-4 py-2">{r.to_location && <LocationLabel location={r.to_location} />}</td>
                <td className="px-4 py-2">{r.product?.description}</td>
                <td className="px-4 py-2 text-gray-500">
                  {r.qty_cases ? `${r.qty_cases} CS ` : ""}
                  {r.qty_each ? `${r.qty_each} EA` : !r.qty_cases ? `${r.quantity} EA` : ""}
                </td>
                <td className="px-4 py-2 text-gray-500">{r.product ? fmtCurrency(lineValue(r.qty_each, r.qty_cases, r.product)) : "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.user?.name ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No recoveries logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

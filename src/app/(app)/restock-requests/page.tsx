import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { fulfillRestockRequest } from "./actions";

export default async function RestockRequestsPage() {
  await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("inventory_thresholds")
    .select(
      "id, reorder_threshold, requested_at, product:products(id, sku, description), location:locations(id, name), requested_by_profile:profiles(id, name)"
    )
    .not("requested_at", "is", null)
    .order("requested_at", { ascending: true });

  const rows = (requests as any[]) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Restock Requests" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Restock Requests</h1>
        {!!rows.length && (
          <Link
            href="/api/restock-requests/export"
            className="rounded-md bg-brand px-4 py-2 text-sm text-white"
          >
            Download CSV
          </Link>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Items checked &ldquo;Request&rdquo; on a location&apos;s Assigned Items table. Mark a request
        fulfilled once it&apos;s been restocked.
      </p>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Threshold</th>
              <th className="px-4 py-2">Requested by</th>
              <th className="px-4 py-2">Requested</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <Link href={`/admin/locations/${r.location?.id}`} className="text-brand hover:underline">
                    {r.location?.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.product?.description}</td>
                <td className="px-4 py-2 text-gray-500">{r.reorder_threshold}</td>
                <td className="px-4 py-2 text-gray-500">{r.requested_by_profile?.name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(r.requested_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <form action={fulfillRestockRequest}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">
                      Mark fulfilled
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No open restock requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function CompsReportPage() {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const { data: comps } = await supabase
    .from("comp_records")
    .select(
      "id, quantity, note, created_at, product:products(sku, description), location:locations(id, name), event:events(name, event_date), user:profiles(name)"
    )
    .order("created_at", { ascending: false });

  const rows = (comps as any[]) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Comps" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Comps</h1>
        {!!rows.length && (
          <Link href="/api/comps/export" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
            Download CSV
          </Link>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Comps logged on Closing count sheets, most recent first.
      </p>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Qty (EA)</th>
              <th className="px-4 py-2">Logged by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">{r.event?.name ?? "—"}</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/locations/${r.location?.id}`} className="text-brand hover:underline">
                    {r.location?.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{r.product?.description}</td>
                <td className="px-4 py-2">{r.quantity}</td>
                <td className="px-4 py-2 text-gray-500">{r.user?.name ?? "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No comps logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

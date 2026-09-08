import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { eachEquivalent } from "@/lib/onHand";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LocationLabel } from "@/components/LocationLabel";

function fmtQty(each: number | null, cases: number | null) {
  const parts: string[] = [];
  if (cases) parts.push(`${cases} CS`);
  if (each) parts.push(`${each} EA`);
  return parts.join(", ") || "—";
}

export default async function CountHistoryDetailPage({ params }: { params: { id: string } }) {
  await requireProfile(["admin", "warehouse", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  const { data: record } = await supabase
    .from("location_counts")
    .select(
      "id, type, submitted_at, notes, location_id, event_id, location:locations(name, yellow_dog_code), event:events(name, event_date), submitted_by:profiles(name)"
    )
    .eq("id", params.id)
    .maybeSingle<any>();

  if (!record) notFound();

  const [{ data: linesRaw }, { data: thresholdsRaw }] = await Promise.all([
    supabase
      .from("location_count_lines")
      .select("product_id, qty_each, qty_cases, product:products(sku, description, case_size)")
      .eq("location_count_id", record.id),
    supabase
      .from("inventory_thresholds")
      .select("product_id, reorder_threshold")
      .eq("location_id", record.location_id)
      .gt("reorder_threshold", 0),
  ]);

  const thresholdByProductId = new Map(
    ((thresholdsRaw as { product_id: string; reorder_threshold: number }[] | null) ?? []).map((t) => [t.product_id, t.reorder_threshold])
  );

  const lines = ((linesRaw as any[]) ?? [])
    .map((l) => {
      const threshold = thresholdByProductId.get(l.product_id);
      const flagged =
        threshold != null && eachEquivalent(l.qty_each, l.qty_cases, l.product?.case_size) <= threshold;
      return { ...l, flagged };
    })
    .sort((a, b) => (a.product?.description ?? "").localeCompare(b.product?.description ?? ""));

  let wasteLines: any[] = [];
  let compLines: any[] = [];
  if (record.type === "closing") {
    const [{ data: wasteRaw }, { data: compRaw }] = await Promise.all([
      supabase
        .from("waste_records")
        .select("quantity, product:products(sku, description)")
        .eq("event_id", record.event_id)
        .eq("location_id", record.location_id),
      supabase
        .from("comp_records")
        .select("quantity, product:products(sku, description)")
        .eq("event_id", record.event_id)
        .eq("location_id", record.location_id),
    ]);
    wasteLines = (wasteRaw as any[]) ?? [];
    compLines = (compRaw as any[]) ?? [];
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Count", href: "/count" },
          { label: `${record.event?.name ?? "Count"} · ${record.location?.name ?? ""}` },
        ]}
      />

      <h1 className="mb-1 text-lg font-semibold capitalize">
        {record.type} Count — <LocationLabel location={record.location} />
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {record.event?.name} · {record.event?.event_date}
      </p>

      <div className="mb-6 flex flex-wrap gap-6 rounded-md border border-gray-200 bg-white p-4 text-sm">
        <div>
          <p className="text-xs font-medium text-gray-500">POST DATE</p>
          <p>{new Date(record.submitted_at).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">POST BY</p>
          <p>{record.submitted_by?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">THRESHOLD FLAG</p>
          <p>
            {lines.some((l) => l.flagged) ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Restock triggered
              </span>
            ) : (
              <span className="text-gray-400">None</span>
            )}
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-base font-semibold">Count</h2>
      <div className="mb-8 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.product_id} className="border-t border-gray-100">
                <td className="px-4 py-2">{l.product?.description}</td>
                <td className="px-4 py-2 text-gray-500">{fmtQty(l.qty_each, l.qty_cases)}</td>
                <td className="px-4 py-2">
                  {l.flagged && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Restock
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!lines.length && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No quantities on this count.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {record.type === "closing" && (
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-base font-semibold">Waste</h2>
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteLines.map((w, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2">{w.product?.description}</td>
                      <td className="px-4 py-2 text-gray-500">{w.quantity} EA</td>
                    </tr>
                  ))}
                  {!wasteLines.length && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                        None logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold">Comps</h2>
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {compLines.map((c, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2">{c.product?.description}</td>
                      <td className="px-4 py-2 text-gray-500">{c.quantity} EA</td>
                    </tr>
                  ))}
                  {!compLines.length && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                        None logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {record.notes && (
        <div>
          <h2 className="mb-2 text-base font-semibold">Comments</h2>
          <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">{record.notes}</p>
        </div>
      )}
    </div>
  );
}

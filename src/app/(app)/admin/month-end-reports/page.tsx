import { createClient } from "@/lib/supabase/server";
import { LocationLabel } from "@/components/LocationLabel";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { resolveMonthEndReport } from "./actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function MonthEndReportsPage() {
  const supabase = createClient();

  const [{ data: pending }, { data: resolved }] = await Promise.all([
    supabase
      .from("month_end_new_item_reports")
      .select(
        "id, year, month, barcode, brand, product_name, case_count, size_each, reported_at, location:locations(id, name, yellow_dog_code), reported_by_profile:profiles(id, name)"
      )
      .is("resolved_at", null)
      .order("reported_at", { ascending: true }),
    supabase
      .from("month_end_new_item_reports")
      .select(
        "id, product_name, reported_at, resolved_at, location:locations(id, name, yellow_dog_code), resolved_by_profile:profiles(id, name)"
      )
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(20),
  ]);

  const pendingRows = (pending as any[]) ?? [];
  const resolvedRows = (resolved as any[]) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Month-End Reports" }]} />
      <h1 className="mb-2 text-lg font-semibold">Month-End: New Item Reports</h1>
      <p className="mb-6 text-sm text-gray-500">
        Items staff hand-typed on a Month-End Count Sheet because they weren&apos;t in the catalog
        yet. Add each as a real Product (with the reported case count as its starting on-hand),
        then mark it added here.
      </p>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">Barcode</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Product Name</th>
              <th className="px-4 py-2">Case Count</th>
              <th className="px-4 py-2">Size Each</th>
              <th className="px-4 py-2">Reported by</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pendingRows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.location && <LocationLabel location={r.location} />}</td>
                <td className="px-4 py-2 text-gray-500">
                  {MONTH_NAMES[r.month - 1]} {r.year}
                </td>
                <td className="px-4 py-2 font-mono text-gray-500">{r.barcode ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.brand ?? "—"}</td>
                <td className="px-4 py-2">{r.product_name}</td>
                <td className="px-4 py-2 text-gray-500">{r.case_count ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.size_each ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.reported_by_profile?.name ?? "—"}</td>
                <td className="px-4 py-2 text-right">
                  <ActionForm action={resolveMonthEndReport} savedLabel="Marked added" className="contents">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">
                      Mark added
                    </button>
                  </ActionForm>
                </td>
              </tr>
            ))}
            {!pendingRows.length && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  No new items reported.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mb-3 mt-8 text-sm font-medium">Recently added</p>
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Product Name</th>
              <th className="px-4 py-2">Marked added by</th>
              <th className="px-4 py-2">Marked added</th>
            </tr>
          </thead>
          <tbody>
            {resolvedRows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.location && <LocationLabel location={r.location} />}</td>
                <td className="px-4 py-2">{r.product_name}</td>
                <td className="px-4 py-2 text-gray-500">{r.resolved_by_profile?.name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(r.resolved_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!resolvedRows.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  None yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

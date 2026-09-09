import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { LocationLabel } from "@/components/LocationLabel";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MONTH_NAMES } from "@/lib/monthNames";
import { resolveMonthEndReport } from "./actions";

interface PendingReport {
  id: string;
  year: number;
  month: number;
  barcode: string | null;
  brand: string | null;
  product_name: string;
  case_count: number | null;
  size_each: string | null;
  reported_at: string;
  location: { id: string; name: string; yellow_dog_code: string | null } | null;
  reported_by_profile: { id: string; name: string } | null;
}

export default async function NewItemsReceivedPage() {
  await requireProfile(["admin"]);
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

  const pendingRows = (pending as any[] as PendingReport[]) ?? [];
  const resolvedRows = (resolved as any[]) ?? [];

  const pendingByLocation = new Map<string, { location: PendingReport["location"]; rows: PendingReport[] }>();
  const unassigned: PendingReport[] = [];
  for (const r of pendingRows) {
    if (!r.location) {
      unassigned.push(r);
      continue;
    }
    const entry = pendingByLocation.get(r.location.id) ?? { location: r.location, rows: [] };
    entry.rows.push(r);
    pendingByLocation.set(r.location.id, entry);
  }
  const locationGroups = Array.from(pendingByLocation.values()).sort((a, b) =>
    (a.location?.name ?? "").localeCompare(b.location?.name ?? "")
  );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Month-End Reports", href: "/admin/month-end-reports" },
          { label: "New Items Received" },
        ]}
      />
      <h1 className="mb-2 text-lg font-semibold">moEND New Items Received</h1>
      <p className="mb-6 text-sm text-gray-500">
        Items staff hand-typed on a Month-End Count Sheet because they weren&apos;t in the catalog yet. Add each as a
        real Product (with the reported case count as its starting on-hand), then mark it added here.
      </p>

      <div className="space-y-3">
        {locationGroups.map(({ location, rows }) => (
          <details key={location!.id} open className="rounded-md border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>{location && <LocationLabel location={location} />}</span>
              <span className="text-gray-500">{rows.length} pending</span>
            </summary>
            <NewItemsTable rows={rows} />
          </details>
        ))}
        {!!unassigned.length && (
          <details open className="rounded-md border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>Unassigned</span>
              <span className="text-gray-500">{unassigned.length} pending</span>
            </summary>
            <NewItemsTable rows={unassigned} />
          </details>
        )}
        {!pendingRows.length && (
          <p className="rounded-md border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
            No new items reported.
          </p>
        )}
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

function NewItemsTable({ rows }: { rows: PendingReport[] }) {
  return (
    <div className="overflow-x-auto border-t border-gray-100">
      <table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="text-gray-500">
          <tr>
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
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-100">
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
        </tbody>
      </table>
    </div>
  );
}

import { DonutChart } from "@/components/DonutChart";
import { fmtCurrency } from "@/lib/format";
import type { MonthEndGroupBy, MonthEndValueGroup, MonthEndValueLine } from "@/lib/monthEndValue";
import { bucketLocationTypes, locationTotals } from "@/lib/monthEndValue";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

// Group -> Subgroup -> product-line drill-down, shared by the moEND TOT
// Inventory Value and moEND TOT Retail Value reports -- whichever
// dimension the person grouped by on screen (Location, Storage Area,
// Category, or Vendor -- Product skips the subgroup level, it's already
// the finest grain) renders through this one view.
export function MonthEndValueReportView({
  lines,
  groups,
  grandTotal,
  groupBy,
  centerLabel,
}: {
  lines: MonthEndValueLine[];
  groups: MonthEndValueGroup[];
  grandTotal: number;
  groupBy: MonthEndGroupBy;
  centerLabel: string;
}) {
  const buckets = bucketLocationTypes(lines);
  const donutSlices = locationTotals(lines).map((l) => ({ label: l.name, value: l.total }));
  const showSubgroupHeader = groupBy !== "product";

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="TOT $Warehouse" value={fmtCurrency(buckets.warehouse)} />
        <StatCard label="TOT $Liquor Room" value={fmtCurrency(buckets.liquorRoom)} />
        <StatCard label="TOT $Kitchen" value={fmtCurrency(buckets.kitchen)} />
        <StatCard label="TOT $Stands" value={fmtCurrency(buckets.stands)} />
        <StatCard label="Grand Total" value={fmtCurrency(grandTotal)} />
      </div>
      <div className="mb-6 rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-3 text-xs font-medium text-gray-500">By location</p>
        <DonutChart slices={donutSlices} centerLabel={centerLabel} emptyLabel="No month-end counts posted for this month yet." />
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <details key={group.id} className="rounded-md border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>{group.name}</span>
              <span className="text-gray-500">{fmtCurrency(group.subtotal)}</span>
            </summary>
            <div className="space-y-3 border-t border-gray-100 px-4 py-3">
              {group.subgroups.map((subgroup) => (
                <details key={subgroup.id} className="rounded-md border border-gray-100 bg-gray-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm">
                    <span>{showSubgroupHeader ? subgroup.name : ""}</span>
                    <span className="text-gray-500">{fmtCurrency(subgroup.subtotal)}</span>
                  </summary>
                  <div className="overflow-x-auto border-t border-gray-200">
                    <table className="w-full whitespace-nowrap text-left text-sm">
                      <thead className="text-gray-500">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Qty (each)</th>
                          <th className="px-3 py-2">Qty (cases)</th>
                          <th className="px-3 py-2">Qty (middle unit)</th>
                          <th className="px-3 py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subgroup.lines.map((line) => (
                          <tr key={`${line.productId}:${line.locationId}`} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-mono text-gray-500">{line.sku}</td>
                            <td className="px-3 py-2">{line.description}</td>
                            <td className="px-3 py-2 text-gray-500">{line.qtyEach ?? "—"}</td>
                            <td className="px-3 py-2 text-gray-500">{line.qtyCases ?? "—"}</td>
                            <td className="px-3 py-2 text-gray-500">
                              {line.qtyMiddleUnit ? `${line.qtyMiddleUnit} ${line.middleUnitLabel ?? ""}`.trim() : "—"}
                            </td>
                            <td className="px-3 py-2 font-medium">{fmtCurrency(line.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
        {!groups.length && (
          <p className="rounded-md border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
            No month-end counts posted for this month yet.
          </p>
        )}
      </div>
    </>
  );
}

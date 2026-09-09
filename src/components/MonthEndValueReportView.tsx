import { DonutChart } from "@/components/DonutChart";
import { LocationLabel } from "@/components/LocationLabel";
import { fmtCurrency } from "@/lib/format";
import type { MonthEndValueLocationGroup } from "@/lib/monthEndValue";
import { locationDisplayName } from "@/lib/locationLabel";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

// Location -> Storage Area -> product-line drill-down, shared by the
// moEND TOT Inventory Value and moEND TOT Retail Value reports.
export function MonthEndValueReportView({
  locations,
  buckets,
  centerLabel,
}: {
  locations: MonthEndValueLocationGroup[];
  buckets: { warehouse: number; liquorRoom: number; kitchen: number; stands: number };
  centerLabel: string;
}) {
  const donutSlices = locations.map((l) => ({ label: locationDisplayName(l), value: l.total }));

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TOT $Warehouse" value={fmtCurrency(buckets.warehouse)} />
        <StatCard label="TOT $Liquor Room" value={fmtCurrency(buckets.liquorRoom)} />
        <StatCard label="TOT $Kitchen" value={fmtCurrency(buckets.kitchen)} />
        <StatCard label="TOT $Stands" value={fmtCurrency(buckets.stands)} />
      </div>
      <div className="mb-6 rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-3 text-xs font-medium text-gray-500">By location</p>
        <DonutChart slices={donutSlices} centerLabel={centerLabel} emptyLabel="No month-end counts posted for this month yet." />
      </div>

      <div className="space-y-3">
        {locations.map((loc) => (
          <details key={loc.id} className="rounded-md border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>
                <LocationLabel location={loc} />
              </span>
              <span className="text-gray-500">{fmtCurrency(loc.total)}</span>
            </summary>
            <div className="space-y-3 border-t border-gray-100 px-4 py-3">
              {loc.areas.map((area) => (
                <details key={area.id} className="rounded-md border border-gray-100 bg-gray-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm">
                    <span>{area.name}</span>
                    <span className="text-gray-500">{fmtCurrency(area.subtotal)}</span>
                  </summary>
                  <div className="overflow-x-auto border-t border-gray-200">
                    <table className="w-full whitespace-nowrap text-left text-sm">
                      <thead className="text-gray-500">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Qty (each)</th>
                          <th className="px-3 py-2">Qty (cases)</th>
                          <th className="px-3 py-2">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {area.lines.map((line) => (
                          <tr key={line.productId} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-mono text-gray-500">{line.sku}</td>
                            <td className="px-3 py-2">{line.description}</td>
                            <td className="px-3 py-2 text-gray-500">{line.qtyEach ?? "—"}</td>
                            <td className="px-3 py-2 text-gray-500">{line.qtyCases ?? "—"}</td>
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
        {!locations.length && (
          <p className="rounded-md border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
            No month-end counts posted for this month yet.
          </p>
        )}
      </div>
    </>
  );
}

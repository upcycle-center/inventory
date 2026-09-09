import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { LocationLabel } from "@/components/LocationLabel";
import { buildMonthEndWasteCompsReport } from "@/lib/monthEndWasteComps";
import { easternDateString } from "@/lib/easternTime";
import { MONTH_NAMES } from "@/lib/monthNames";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default async function MonthEndWasteCompsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.year) || defaultYear;
  const month = Number(searchParams.month) || defaultMonth;

  const { locations, wasteTotal, compTotal } = await buildMonthEndWasteCompsReport(supabase, year, month);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Month-End Reports", href: "/admin/month-end-reports" },
          { label: "TOT Waste & Comps" },
        ]}
      />
      <h1 className="mb-2 text-lg font-semibold">moEND TOT Waste & Comps</h1>
      <p className="mb-6 text-sm text-gray-500">
        Waste and comps logged at each location during {MONTH_NAMES[month - 1]} {year} (same event-tied records the
        Dashboard tracks, filtered to this calendar month).
      </p>
      <MonthYearPicker basePath="/admin/month-end-reports/waste-comps" year={year} month={month} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2">
        <StatCard label="Waste this month (EA)" value={String(wasteTotal)} />
        <StatCard label="Comps this month (EA)" value={String(compTotal)} />
      </div>

      <div className="space-y-3">
        {locations.map((loc) => (
          <details key={loc.id} className="rounded-md border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>
                <LocationLabel location={loc} />
              </span>
              <span className="text-gray-500">
                Waste {loc.wasteTotal} · Comps {loc.compTotal}
              </span>
            </summary>
            <div className="space-y-3 border-t border-gray-100 px-4 py-3">
              {loc.areas.map((area) => (
                <details key={area.id} className="rounded-md border border-gray-100 bg-gray-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm">
                    <span>{area.name}</span>
                    <span className="text-gray-500">
                      Waste {area.wasteSubtotal} · Comps {area.compSubtotal}
                    </span>
                  </summary>
                  <div className="overflow-x-auto border-t border-gray-200">
                    <table className="w-full whitespace-nowrap text-left text-sm">
                      <thead className="text-gray-500">
                        <tr>
                          <th className="px-3 py-2">SKU</th>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Waste (EA)</th>
                          <th className="px-3 py-2">Comps (EA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {area.lines.map((line) => (
                          <tr key={line.productId} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-mono text-gray-500">{line.sku}</td>
                            <td className="px-3 py-2">{line.description}</td>
                            <td className="px-3 py-2 text-gray-500">{line.waste}</td>
                            <td className="px-3 py-2 text-gray-500">{line.comp}</td>
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
            No waste or comps logged this month.
          </p>
        )}
      </div>
    </div>
  );
}

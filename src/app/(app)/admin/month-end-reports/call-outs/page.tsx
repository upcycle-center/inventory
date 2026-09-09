import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { LocationLabel } from "@/components/LocationLabel";
import { buildMonthEndCallOutsReport } from "@/lib/monthEndCallOuts";
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

function fmtVariance(value: number) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0";
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function varianceColor(value: number) {
  if (value === 0) return "text-gray-500";
  return value < 0 ? "text-red-600" : "text-amber-600";
}

export default async function MonthEndCallOutsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.year) || defaultYear;
  const month = Number(searchParams.month) || defaultMonth;

  const { locations, avgVariance, shortStaffedCount } = await buildMonthEndCallOutsReport(supabase, year, month);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Month-End Reports", href: "/admin/month-end-reports" },
          { label: "Workforce Call-Outs" },
        ]}
      />
      <h1 className="mb-2 text-lg font-semibold">moEND Workforce Call-Outs</h1>
      <p className="mb-6 text-sm text-gray-500">
        Confirmed staffing vs. recommended, across {MONTH_NAMES[month - 1]} {year}&apos;s events. There&apos;s no
        per-person attendance record in the system yet — this is confirmed headcount vs. recommendation per stand, the
        same figure the Dashboard&apos;s &ldquo;Avg staff variance&rdquo; stat uses, so it can&apos;t break out by
        Stand Role.
      </p>
      <MonthYearPicker basePath="/admin/month-end-reports/call-outs" year={year} month={month} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2">
        <StatCard label="Avg staff variance" value={fmtVariance(avgVariance)} />
        <StatCard label="Short-staffed events" value={String(shortStaffedCount)} />
      </div>

      <div className="space-y-3">
        {locations.map((loc) => (
          <details key={loc.id} className="rounded-md border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>
                <LocationLabel location={loc} />
              </span>
              <span className={varianceColor(loc.avgVariance)}>
                Avg {fmtVariance(loc.avgVariance)} · {loc.shortStaffedCount} short-staffed
              </span>
            </summary>
            <div className="overflow-x-auto border-t border-gray-100">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Event Date</th>
                    <th className="px-4 py-2">Event Name</th>
                    <th className="px-4 py-2">Recommended</th>
                    <th className="px-4 py-2">Confirmed</th>
                    <th className="px-4 py-2">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {loc.events.map((e) => (
                    <tr key={e.eventId} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-500">{e.eventDate}</td>
                      <td className="px-4 py-2">{e.eventName}</td>
                      <td className="px-4 py-2 text-gray-500">{e.recommended}</td>
                      <td className="px-4 py-2 text-gray-500">{e.confirmed}</td>
                      <td className={`px-4 py-2 font-medium ${varianceColor(e.variance)}`}>{fmtVariance(e.variance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
        {!locations.length && (
          <p className="rounded-md border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
            No confirmed staffing recorded for this month.
          </p>
        )}
      </div>
    </div>
  );
}

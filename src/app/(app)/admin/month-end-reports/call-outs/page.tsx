import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { LocationLabel } from "@/components/LocationLabel";
import { buildMonthEndCallOutsReport, getLocationCallOutEntries } from "@/lib/monthEndCallOuts";
import { easternDateString, easternDateTimeString } from "@/lib/easternTime";
import { MONTH_NAMES } from "@/lib/monthNames";

const REASON_LABELS: Record<"call_out" | "no_show" | "other", string> = {
  call_out: "Call-Out",
  no_show: "No-Show",
  other: "Adjustment",
};

const REASON_BADGE_CLASS: Record<"call_out" | "no_show" | "other", string> = {
  call_out: "bg-amber-100 text-amber-700",
  no_show: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-600",
};

export default async function MonthEndCallOutsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; location?: string };
}) {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.year) || defaultYear;
  const month = Number(searchParams.month) || defaultMonth;
  const basePath = "/admin/month-end-reports/call-outs";
  const monthQuery = `year=${year}&month=${month}`;

  if (searchParams.location) {
    const [{ data: location }, entries] = await Promise.all([
      supabase.from("locations").select("id, name, yellow_dog_code").eq("id", searchParams.location).single(),
      getLocationCallOutEntries(supabase, year, month, searchParams.location),
    ]);

    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Month-End Reports", href: "/admin/month-end-reports" },
            { label: "Workforce Attendance", href: `${basePath}?${monthQuery}` },
            { label: location?.name ?? "Location" },
          ]}
        />
        <Link href={`${basePath}?${monthQuery}`} className="mb-2 inline-block text-sm text-brand hover:underline">
          ← Back to Workforce Attendance
        </Link>
        <h1 className="mb-1 text-lg font-semibold">{location ? <LocationLabel location={location} /> : "Location"}</h1>
        <p className="mb-6 text-sm text-gray-500">
          Every Call-Out, No-Show, and Adjustment logged here during {MONTH_NAMES[month - 1]} {year}.
        </p>

        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          {entries.length > 0 ? (
            <table className="w-full whitespace-nowrap text-left text-xs">
              <thead className="text-gray-500">
                <tr>
                  <th className="px-3 py-1.5">Role</th>
                  <th className="px-3 py-1.5">Reason</th>
                  <th className="px-3 py-1.5">Note</th>
                  <th className="px-3 py-1.5">Event</th>
                  <th className="px-3 py-1.5">Reported</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{e.roleName}</td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REASON_BADGE_CLASS[e.callOutType]}`}>
                        {REASON_LABELS[e.callOutType]}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">{e.note ?? "—"}</td>
                    <td className="px-3 py-1.5 text-gray-500">
                      {e.eventName} · {e.eventDate}
                    </td>
                    <td className="px-3 py-1.5 text-gray-400">
                      {e.reportedByName ?? "—"} · {easternDateTimeString(new Date(e.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-400">Nothing logged here this month.</p>
          )}
        </div>
      </div>
    );
  }

  const { roleBreakdown, locationBreakdown } = await buildMonthEndCallOutsReport(supabase, year, month);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Month-End Reports", href: "/admin/month-end-reports" },
          { label: "Workforce Attendance" },
        ]}
      />
      <h1 className="mb-2 text-lg font-semibold">moEND Workforce Attendance</h1>
      <p className="mb-6 text-sm text-gray-500">
        Call-Outs and No-Shows logged by role on each event&apos;s page, across {MONTH_NAMES[month - 1]} {year}.
      </p>
      <MonthYearPicker basePath={basePath} year={year} month={month} />

      <div className="mb-6 mt-6 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <p className="px-4 pt-3 text-sm font-medium">Call-Outs / No-Shows by Role</p>
        {roleBreakdown.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Call-Outs</th>
                <th className="px-4 py-2">No-Shows</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {roleBreakdown.map((r) => (
                <tr key={r.roleName} className="border-t border-gray-100">
                  <td className="px-4 py-2">{r.roleName}</td>
                  <td className="px-4 py-2 text-gray-500">{r.callOuts}</td>
                  <td className="px-4 py-2 text-gray-500">{r.noShows}</td>
                  <td className="px-4 py-2 font-medium">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No call-outs or no-shows logged for this month.</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <p className="px-4 pt-3 text-sm font-medium">Call-Outs / No-Shows by Location</p>
        {locationBreakdown.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Call-Outs</th>
                <th className="px-4 py-2">No-Shows</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {locationBreakdown.map((l) => (
                <tr key={l.locationId} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <LocationLabel location={{ name: l.name, yellow_dog_code: l.yellow_dog_code }} />
                  </td>
                  <td className="px-4 py-2 text-gray-500">{l.callOuts}</td>
                  <td className="px-4 py-2 text-gray-500">{l.noShows}</td>
                  <td className="px-4 py-2 font-medium">{l.total}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`${basePath}?${monthQuery}&location=${l.locationId}`}
                      className="text-xs text-brand hover:underline"
                    >
                      View log →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-gray-400">No call-outs or no-shows logged for this month.</p>
        )}
      </div>
    </div>
  );
}

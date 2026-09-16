import Link from "next/link";
import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { LocationLabel } from "@/components/LocationLabel";
import { ThreeStatCard } from "@/components/ThreeStatCard";
import { ReasonBadge } from "@/components/ReasonBadge";
import {
  buildMonthEndCallOutsReport,
  getEventCallOutEntries,
  getLocationCallOutEntries,
  getRoleCallOutEntries,
  type CallOutLogEntry,
} from "@/lib/monthEndCallOuts";
import { easternDateString, easternDateTimeString } from "@/lib/easternTime";
import { MONTH_NAMES } from "@/lib/monthNames";

// The three summary tables (by Event/Location/Role) share this shape so
// their columns line up with each other pixel-for-pixel -- table-fixed
// with the same percentage widths on every <th>, regardless of how long
// a given row's label happens to be (truncated instead of pushing the
// table wider).
type BreakdownRow = {
  key: string;
  label: ReactNode;
  callOuts: number;
  noShows: number;
  total: number;
  viewLogHref: string;
};

function BreakdownTable({
  title,
  labelHeader,
  rows,
  emptyMessage,
}: {
  title: string;
  labelHeader: string;
  rows: BreakdownRow[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <p className="px-4 pt-3 text-sm font-medium">{title}</p>
      {rows.length > 0 ? (
        <table className="w-full table-fixed text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="w-[48%] px-4 py-2">{labelHeader}</th>
              <th className="w-[13%] px-4 py-2 text-center">Call-Outs</th>
              <th className="w-[13%] px-4 py-2 text-center">No-Shows</th>
              <th className="w-[12%] px-4 py-2 text-center">Total</th>
              <th className="w-[14%] whitespace-nowrap px-2 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-gray-100">
                <td className="truncate px-4 py-2">{r.label}</td>
                <td className="px-4 py-2 text-center text-gray-500">{r.callOuts}</td>
                <td className="px-4 py-2 text-center text-gray-500">{r.noShows}</td>
                <td className="px-4 py-2 text-center font-medium">{r.total}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <Link href={r.viewLogHref} className="text-xs text-brand hover:underline">
                    View log →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-gray-400">{emptyMessage}</p>
      )}
    </div>
  );
}

// showRole/showLocation/showEvent let each drill-down hide whichever
// column is already implied by the page it's on (e.g. the Location
// drill-down doesn't need to repeat the location on every row) while the
// Role drill-down, which spans every location and event, shows both.
function EntriesTable({
  entries,
  showRole = true,
  showLocation = false,
  showEvent = false,
}: {
  entries: CallOutLogEntry[];
  showRole?: boolean;
  showLocation?: boolean;
  showEvent?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      {entries.length > 0 ? (
        <table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="text-gray-500">
            <tr>
              {showRole && <th className="px-3 py-1.5">Role</th>}
              <th className="px-3 py-1.5">Reason</th>
              <th className="px-3 py-1.5">Note</th>
              {showLocation && <th className="px-3 py-1.5">Location</th>}
              {showEvent && <th className="px-3 py-1.5">Event</th>}
              <th className="px-3 py-1.5">Reported</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                {showRole && <td className="px-3 py-1.5">{e.roleName}</td>}
                <td className="px-3 py-1.5">
                  <ReasonBadge type={e.callOutType} />
                </td>
                <td className="px-3 py-1.5 text-gray-500">{e.note ?? "—"}</td>
                {showLocation && <td className="px-3 py-1.5 text-gray-500">{e.locationName}</td>}
                {showEvent && (
                  <td className="px-3 py-1.5 text-gray-500">
                    {e.eventName} · {e.eventDate}
                  </td>
                )}
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
  );
}

export default async function MonthEndCallOutsPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; location?: string; event?: string; role?: string };
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
        <EntriesTable entries={entries} showEvent />
      </div>
    );
  }

  if (searchParams.event) {
    const [{ data: event }, entries] = await Promise.all([
      supabase.from("events").select("id, name, event_date").eq("id", searchParams.event).single(),
      getEventCallOutEntries(supabase, searchParams.event),
    ]);

    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Month-End Reports", href: "/admin/month-end-reports" },
            { label: "Workforce Attendance", href: `${basePath}?${monthQuery}` },
            { label: event?.name ?? "Event" },
          ]}
        />
        <Link href={`${basePath}?${monthQuery}`} className="mb-2 inline-block text-sm text-brand hover:underline">
          ← Back to Workforce Attendance
        </Link>
        <h1 className="mb-1 text-lg font-semibold">{event?.name ?? "Event"}</h1>
        <p className="mb-6 text-sm text-gray-500">
          Every Call-Out, No-Show, and Adjustment logged across all locations for this event{event?.event_date ? ` · ${event.event_date}` : ""}.
        </p>
        <EntriesTable entries={entries} showLocation />
      </div>
    );
  }

  if (searchParams.role) {
    const entries = await getRoleCallOutEntries(supabase, year, month, searchParams.role);

    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Month-End Reports", href: "/admin/month-end-reports" },
            { label: "Workforce Attendance", href: `${basePath}?${monthQuery}` },
            { label: searchParams.role },
          ]}
        />
        <Link href={`${basePath}?${monthQuery}`} className="mb-2 inline-block text-sm text-brand hover:underline">
          ← Back to Workforce Attendance
        </Link>
        <h1 className="mb-1 text-lg font-semibold">{searchParams.role}</h1>
        <p className="mb-6 text-sm text-gray-500">
          Every Call-Out, No-Show, and Adjustment logged for this role during {MONTH_NAMES[month - 1]} {year}.
        </p>
        <EntriesTable entries={entries} showRole={false} showLocation showEvent />
      </div>
    );
  }

  const { roleBreakdown, locationBreakdown, eventBreakdown, summary } = await buildMonthEndCallOutsReport(supabase, year, month);

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

      <div className="mt-6 max-w-xs">
        <ThreeStatCard
          values={[summary.callOuts, summary.noShows, summary.other]}
          labels={["Call-Outs", "No-Shows", "Other"]}
        />
      </div>

      <div className="mt-6 space-y-6">
        <BreakdownTable
          title="Call-Outs / No-Shows by EVENT"
          labelHeader="Event"
          emptyMessage="No call-outs or no-shows logged for this month."
          rows={eventBreakdown.map((e) => ({
            key: e.eventId,
            label: (
              <>
                {e.eventName} <span className="text-gray-400">· {e.eventDate}</span>
              </>
            ),
            callOuts: e.callOuts,
            noShows: e.noShows,
            total: e.total,
            viewLogHref: `${basePath}?${monthQuery}&event=${e.eventId}`,
          }))}
        />

        <BreakdownTable
          title="Call-Outs / No-Shows by LOCATION"
          labelHeader="Location"
          emptyMessage="No call-outs or no-shows logged for this month."
          rows={locationBreakdown.map((l) => ({
            key: l.locationId,
            label: <LocationLabel location={{ name: l.name, yellow_dog_code: l.yellow_dog_code }} />,
            callOuts: l.callOuts,
            noShows: l.noShows,
            total: l.total,
            viewLogHref: `${basePath}?${monthQuery}&location=${l.locationId}`,
          }))}
        />

        <BreakdownTable
          title="Call-Outs / No-Shows by ROLE"
          labelHeader="Role"
          emptyMessage="No call-outs or no-shows logged for this month."
          rows={roleBreakdown.map((r) => ({
            key: r.roleName,
            label: r.roleName,
            callOuts: r.callOuts,
            noShows: r.noShows,
            total: r.total,
            viewLogHref: `${basePath}?${monthQuery}&role=${encodeURIComponent(r.roleName)}`,
          }))}
        />
      </div>
    </div>
  );
}

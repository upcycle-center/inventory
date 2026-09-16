import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildEventReport, type EventStatusFilter } from "@/lib/eventReport";

const STATUS_OPTIONS: { value: EventStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "upcoming", label: "Upcoming" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

export default async function EventsReportPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const statusFilter: EventStatusFilter = STATUS_OPTIONS.some((o) => o.value === searchParams.status)
    ? (searchParams.status as EventStatusFilter)
    : "all";
  const { rows, error } = await buildEventReport(supabase, statusFilter);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Reports" }, { label: "Events" }]} />
      <h1 className="mb-2 text-lg font-semibold">Events Report</h1>
      <p className="mb-6 text-sm text-gray-500">
        Attendance and staffing for the most recent events, most recent first. Click an event to open it.
      </p>

      <form action="/admin/reports/events" method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500">
          Status
          <select name="status" defaultValue={statusFilter} className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-gray-300 px-4 py-2 text-sm">
          Filter
        </button>
      </form>

      {error && (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load events: {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Event Date</th>
              <th className="px-4 py-2">Event Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">TOT Tickets</th>
              <th className="px-4 py-2">GRN Room</th>
              <th className="px-4 py-2">VIP Lounge</th>
              <th className="px-4 py-2">#Stands</th>
              <th className="px-4 py-2">WFM Shifts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-500">{r.eventDate}</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/events/${r.id}`} className="text-brand hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2 uppercase text-gray-500">{r.status}</td>
                <td className="px-4 py-2 text-gray-500">{r.totTicketsPosted ? r.totTickets : "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.grnRoomAttendance ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.vipLoungeAttendance ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.standsOpen}</td>
                <td className="px-4 py-2 text-gray-500">{r.wfmShifts}</td>
              </tr>
            ))}
            {!rows.length && !error && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  No events {statusFilter === "all" ? "on record yet" : `with status "${statusFilter}"`}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

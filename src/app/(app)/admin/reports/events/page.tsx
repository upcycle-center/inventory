import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildEventReport } from "@/lib/eventReport";

export default async function EventsReportPage() {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const rows = await buildEventReport(supabase);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Reports" }, { label: "Events" }]} />
      <h1 className="mb-2 text-lg font-semibold">Events Report</h1>
      <p className="mb-6 text-sm text-gray-500">
        Staffing and count-sheet completion for the most recent events, most recent first. Click an event to open it.
      </p>
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="px-4 py-2">Event Date</th>
              <th className="px-4 py-2">Event Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">EST Tickets</th>
              <th className="px-4 py-2">TOT Tickets</th>
              <th className="px-4 py-2">Recommended Shifts</th>
              <th className="px-4 py-2">Confirmed Shifts</th>
              <th className="px-4 py-2">Locations Confirmed</th>
              <th className="px-4 py-2">Count Sheets</th>
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
                <td className="px-4 py-2 text-gray-500">{r.estTickets ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.totTicketsPosted ? r.totTickets : "—"}</td>
                <td className="px-4 py-2 text-gray-500">{r.recommendedShifts}</td>
                <td className="px-4 py-2 text-gray-500">{r.confirmedShifts}</td>
                <td className="px-4 py-2 text-gray-500">
                  {r.locationsConfirmed}/{r.locationsOpen}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {r.countSheetsSubmitted}/{r.countSheetsExpected}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  No events on record yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

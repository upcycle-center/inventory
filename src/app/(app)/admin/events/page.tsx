import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/supabase/types";
import { createEvent } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminEventsPage() {
  const supabase = createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: false });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Events" }]} />
      <h1 className="mb-6 text-lg font-semibold">Events</h1>

      <ActionForm action={createEvent} savedLabel="Event created" className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Name</label>
          <input name="name" placeholder="e.g. Friday Night Show" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Date</label>
          <input name="event_date" type="date" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Create event
        </button>
      </ActionForm>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Event</th>
            <th className="pb-2">Date</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {(events as Event[] | null)?.map((e) => (
            <tr key={e.id} className="border-t border-gray-100">
              <td className="py-2">
                <Link href={`/admin/events/${e.id}`} className="text-brand hover:underline">
                  {e.name}
                </Link>
              </td>
              <td className="py-2">{e.event_date}</td>
              <td className="py-2 uppercase text-gray-500">{e.status}</td>
            </tr>
          ))}
          {!events?.length && (
            <tr>
              <td colSpan={3} className="py-4 text-gray-400">
                No events yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

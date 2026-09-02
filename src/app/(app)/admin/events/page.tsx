import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/lib/supabase/types";
import { createEvent } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const { status } = searchParams;

  let query = supabase.from("events").select("*").order("event_date", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: events } = await query;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Events" }]} />
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Events</h1>
        {status && (
          <>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs uppercase text-gray-600">{status} only</span>
            <Link href="/admin/events" className="text-xs text-brand hover:underline">
              Clear filter
            </Link>
          </>
        )}
      </div>

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

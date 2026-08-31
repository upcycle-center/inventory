import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EventLocation, Location, Profile } from "@/lib/supabase/types";
import { updateEventStatus } from "../actions";
import { assignLocationLead, removeAssignment, toggleLocationOpen, updateEventDetails } from "./actions";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: event }, { data: locations }, { data: users }, { data: assignments }, { data: eventLocations }] =
    await Promise.all([
      supabase.from("events").select("*").eq("id", params.id).single(),
      supabase.from("locations").select("*").eq("active", true).neq("type", "warehouse").order("name"),
      supabase.from("profiles").select("*").order("name"),
      supabase
        .from("event_location_assignments")
        .select("id, location_id, location_lead_user_id, location:locations(id, name), location_lead:profiles(id, name)")
        .eq("event_id", params.id),
      supabase.from("event_locations").select("*").eq("event_id", params.id),
    ]);

  if (!event) notFound();

  const openByLocationId = new Map(
    ((eventLocations as EventLocation[] | null) ?? []).map((el) => [el.location_id, el.is_open])
  );

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{event.name}</h1>
      <p className="mb-6 text-sm text-gray-500">{event.event_date}</p>

      <form action={updateEventStatus} className="mb-8 flex items-center gap-2">
        <input type="hidden" name="id" value={event.id} />
        <label className="text-sm text-gray-500">Status</label>
        <select name="status" defaultValue={event.status} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
          <option value="upcoming">Upcoming</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-sm">
          Update
        </button>
      </form>

      <form action={updateEventDetails} className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
        <input type="hidden" name="event_id" value={event.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Attendance</label>
          <input
            name="attendance"
            type="number"
            min={0}
            step={1}
            defaultValue={event.attendance ?? ""}
            placeholder="e.g. 2500"
            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Team Size</label>
          <input
            name="team_size"
            type="number"
            min={0}
            step={1}
            defaultValue={event.team_size ?? ""}
            placeholder="e.g. 45"
            className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-sm">
          Save
        </button>
      </form>

      <div className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium">Locations open for this show</p>
        <ul className="max-w-xl divide-y divide-gray-100">
          {(locations as Location[] | null)?.map((l) => {
            const isOpen = openByLocationId.get(l.id) ?? false;
            return (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span>{l.name}</span>
                <form action={toggleLocationOpen}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="location_id" value={l.id} />
                  <input type="hidden" name="is_open" value={String(isOpen)} />
                  <button
                    type="submit"
                    className={
                      isOpen
                        ? "rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                        : "rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300"
                    }
                  >
                    {isOpen ? "Open" : "Closed"}
                  </button>
                </form>
              </li>
            );
          })}
          {!locations?.length && <li className="py-4 text-gray-400">No locations available.</li>}
        </ul>
      </div>

      <form action={assignLocationLead} className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4">
        <input type="hidden" name="event_id" value={event.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Stand / Kitchen</label>
          <select name="location_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {(locations as Location[] | null)?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Lead</label>
          <select name="location_lead_user_id" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {(users as Profile[] | null)?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Assign
        </button>
      </form>

      <table className="w-full max-w-xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Location</th>
            <th className="pb-2">Lead</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {(assignments as any[] | null)?.map((a) => (
            <tr key={a.id} className="border-t border-gray-100">
              <td className="py-2">{a.location?.name}</td>
              <td className="py-2">{a.location_lead?.name}</td>
              <td className="py-2 text-right">
                <form action={removeAssignment}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="event_id" value={event.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Remove
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {!assignments?.length && (
            <tr>
              <td colSpan={3} className="py-4 text-gray-400">
                No assignments yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

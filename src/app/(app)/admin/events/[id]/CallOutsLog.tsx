"use client";

import { useState } from "react";
import { easternDateTimeString } from "@/lib/easternTime";
import { deleteShiftCallOut } from "./actions";
import { ReasonBadge } from "@/components/ReasonBadge";
import type { ShiftCallOut, Profile, Staff } from "@/lib/supabase/types";

type CallOutRow = ShiftCallOut & { reported_by_profile: Profile | null; staff: Staff | null };

// Client-side filter over an already-fetched list -- a single event's log
// is small enough that there's no need to round-trip to the server just to
// narrow it down by reason.
export function CallOutsLog({
  eventId,
  callOuts,
  locationNameById,
}: {
  eventId: string;
  callOuts: CallOutRow[];
  locationNameById: Map<string, string>;
}) {
  const [filter, setFilter] = useState<"all" | ShiftCallOut["call_out_type"]>("all");
  const filtered = filter === "all" ? callOuts : callOuts.filter((c) => c.call_out_type === filter);

  return (
    <div>
      <label className="mb-3 block text-xs text-gray-500">
        Filter by reason
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="all">All</option>
          <option value="call_out">Call-Out</option>
          <option value="no_show">No-Show</option>
          <option value="other">Adjustment</option>
        </select>
      </label>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="pb-2 pr-3">Location</th>
                <th className="pb-2 pr-3">Role</th>
                <th className="pb-2 pr-3">Staff</th>
                <th className="pb-2 pr-3">Reason</th>
                <th className="pb-2 pr-3">Note</th>
                <th className="pb-2 pr-3">Reported</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="py-2 pr-3">{locationNameById.get(c.location_id) ?? "—"}</td>
                  <td className="py-2 pr-3">{c.role_name}</td>
                  <td className="py-2 pr-3 text-gray-500">{c.staff?.name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <ReasonBadge type={c.call_out_type} />
                  </td>
                  <td className="py-2 pr-3 text-gray-500">{c.note ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs text-gray-400">
                    {c.reported_by_profile?.name ?? "—"} · {easternDateTimeString(new Date(c.created_at))}
                  </td>
                  <td className="py-2">
                    <form action={deleteShiftCallOut}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="event_id" value={eventId} />
                      <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          {filter === "all" ? "No staffing changes logged for this event yet." : "No entries match this filter."}
        </p>
      )}
    </div>
  );
}

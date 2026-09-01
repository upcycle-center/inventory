"use client";

import type { Profile } from "@/lib/supabase/types";
import { ActionForm } from "@/components/ActionForm";
import { setLocationLead } from "./actions";

export function LocationLeadSelect({
  eventId,
  locationId,
  currentLeadId,
  users,
  disabled,
}: {
  eventId: string;
  locationId: string;
  currentLeadId: string | null;
  users: Profile[];
  disabled: boolean;
}) {
  return (
    <ActionForm action={setLocationLead} savedLabel="Lead set" className="contents">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="location_id" value={locationId} />
      <select
        name="location_lead_user_id"
        defaultValue={currentLeadId ?? ""}
        disabled={disabled}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">— Unassigned —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </ActionForm>
  );
}

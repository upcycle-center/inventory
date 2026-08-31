"use client";

import type { Profile } from "@/lib/supabase/types";
import { updateUserRole } from "./actions";

export function RoleSelect({ user }: { user: Profile }) {
  return (
    <form action={updateUserRole} className="flex items-center gap-2">
      <input type="hidden" name="id" value={user.id} />
      <select
        name="role"
        defaultValue={user.role}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="stand_lead">Stand Lead</option>
        <option value="warehouse">Warehouse</option>
        <option value="admin">Admin</option>
      </select>
    </form>
  );
}

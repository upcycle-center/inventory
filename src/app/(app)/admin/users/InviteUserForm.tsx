"use client";

import { useState, useTransition } from "react";
import { inviteUser } from "./actions";

export function InviteUserForm() {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await inviteUser(formData);
          setResult(res.message);
        });
      }}
      className="grid gap-4 rounded-md border border-gray-200 bg-white p-4"
    >
      <p className="text-sm font-medium">Add a user</p>
      <div className="grid grid-cols-2 gap-4">
        <input name="name" placeholder="Name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="role" defaultValue="stand_lead" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="stand_lead">Stand Lead</option>
          <option value="warehouse">Warehouse</option>
          <option value="kitchen">Kitchen</option>
          <option value="catering">Catering</option>
          <option value="ops">Operations</option>
          <option value="admin">Admin</option>
        </select>
        <input
          name="notification_email"
          type="email"
          placeholder="Email (optional — for notifications, not login)"
          className="col-span-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="username"
          placeholder="Username (used to sign in)"
          required
          autoCapitalize="none"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input name="password" placeholder="Temporary password" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={isPending} className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50">
        {isPending ? "Creating…" : "Create user"}
      </button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </form>
  );
}

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
      className="grid max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4"
    >
      <p className="text-sm font-medium">Add a user</p>
      <input name="name" placeholder="Name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="email" type="email" placeholder="Email" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="password" placeholder="Temporary password" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <select name="role" defaultValue="stand_lead" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
        <option value="stand_lead">Stand Lead</option>
        <option value="warehouse">Warehouse</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" disabled={isPending} className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50">
        {isPending ? "Creating…" : "Create user"}
      </button>
      {result && <p className="text-sm text-gray-600">{result}</p>}
    </form>
  );
}

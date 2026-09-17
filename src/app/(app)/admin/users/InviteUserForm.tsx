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
      className="grid grid-cols-2 gap-4 rounded-md border border-gray-200 bg-white p-4"
    >
      <input name="first_name" placeholder="First name" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="last_name" placeholder="Last name" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input name="phone" placeholder="Phone (optional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <input
        name="notification_email"
        type="email"
        placeholder="Email (optional)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <select name="role" defaultValue="stand_lead" className="col-span-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        <option value="stand_lead">Stand Lead</option>
        <option value="warehouse">Warehouse</option>
        <option value="kitchen">Kitchen</option>
        <option value="catering">Catering</option>
        <option value="ops">Operations</option>
        <option value="admin">Admin</option>
      </select>
      <input
        name="username"
        placeholder="Username (used to sign in)"
        required
        autoCapitalize="none"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input name="password" placeholder="Temporary password" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      <button
        type="submit"
        disabled={isPending}
        className="col-span-2 w-fit rounded-md bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create user"}
      </button>
      {result && <p className="col-span-2 text-sm text-gray-600">{result}</p>}
    </form>
  );
}

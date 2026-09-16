"use client";

import { useState, useTransition } from "react";
import { deleteStaff } from "./actions";

export function DeleteStaffButton({ staffId }: { staffId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this staff member permanently? This can't be undone.")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteStaff(staffId);
      if (res?.error) setMessage(res.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {message && <p className="mt-1 max-w-xs text-xs text-red-600">{message}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { deleteEvent } from "../actions";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this event permanently? This removes all its staffing, counts, and waste history too. This can't be undone.")) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteEvent(eventId);
      if (res?.error) setMessage(res.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {message && <p className="mt-1 max-w-xs text-xs text-red-600">{message}</p>}
    </div>
  );
}

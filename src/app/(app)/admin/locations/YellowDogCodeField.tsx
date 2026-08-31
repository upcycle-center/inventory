"use client";

import { useState, useTransition } from "react";
import type { Location } from "@/lib/supabase/types";
import { updateYellowDogCode } from "./actions";

export function YellowDogCodeField({ location }: { location: Location }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await updateYellowDogCode(formData);
          setMessage(res.message);
        });
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={location.id} />
      <input
        name="yellow_dog_code"
        defaultValue={location.yellow_dog_code ?? ""}
        placeholder="000"
        maxLength={3}
        pattern="\d{3}"
        className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center font-mono text-sm"
      />
      <button type="submit" disabled={isPending} className="text-xs text-brand hover:underline disabled:opacity-50">
        {isPending ? "Saving…" : "Save"}
      </button>
      {message && <span className="text-xs text-gray-400">{message}</span>}
    </form>
  );
}

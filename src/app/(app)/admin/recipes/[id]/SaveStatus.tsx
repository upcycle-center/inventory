"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Status = { state: "idle" | "saved" | "error"; message?: string };

const SaveStatusContext = createContext<{ status: Status; setStatus: (s: Status) => void } | null>(null);

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  return <SaveStatusContext.Provider value={{ status, setStatus }}>{children}</SaveStatusContext.Provider>;
}

export function useSaveStatus() {
  const ctx = useContext(SaveStatusContext);
  if (!ctx) throw new Error("useSaveStatus must be used within SaveStatusProvider");
  return ctx;
}

// Renders the top edit form's saved/error indicator down by the action
// buttons instead of up by the form fields, since the Save button itself
// lives down there (it submits the form via the HTML form="..." attribute).
export function SaveStatusIndicator({ savedLabel = "Saved" }: { savedLabel?: string }) {
  const { status } = useSaveStatus();
  if (status.state === "saved") return <span className="text-xs font-medium text-green-600">✓ {savedLabel}</span>;
  if (status.state === "error") return <span className="text-xs font-medium text-red-600">{status.message ?? "Something went wrong"}</span>;
  return null;
}

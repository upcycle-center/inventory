"use client";

import { ActionForm } from "@/components/ActionForm";
import { useSaveStatus } from "./SaveStatus";

// Wires the top edit-recipe form's save status into the page's shared
// SaveStatusContext instead of rendering its own inline indicator, so
// the "✓ Saved"/error text can show next to the Save button at the
// bottom of the page instead of up by the form fields.
export function TopEditForm(props: Omit<React.ComponentProps<typeof ActionForm>, "onStatusChange" | "hideStatus">) {
  const { setStatus } = useSaveStatus();
  return (
    <ActionForm
      {...props}
      hideStatus
      onStatusChange={(state, message) => setStatus({ state, message })}
    />
  );
}

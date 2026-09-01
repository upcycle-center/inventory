"use client";

import type { Profile } from "@/lib/supabase/types";
import { ActionForm } from "@/components/ActionForm";
import { updateUserCertifications } from "./actions";

export function CertificationsInput({ user }: { user: Profile }) {
  return (
    <ActionForm action={updateUserCertifications} savedLabel="Certifications updated" className="flex items-center gap-2">
      <input type="hidden" name="id" value={user.id} />
      <input
        name="certifications"
        defaultValue={user.certifications.join(", ")}
        placeholder="e.g. Certified Bartender, Food Handler"
        className="w-64 rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <button type="submit" className="text-xs font-medium text-brand hover:underline">
        Save
      </button>
    </ActionForm>
  );
}

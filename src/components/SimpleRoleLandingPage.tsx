import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRoleLandingData } from "@/lib/roleLandingData";
import { RoleActionButtons } from "@/components/RoleActionButtons";
import type { UserRole } from "@/lib/supabase/types";

// The landing page for a role with no bespoke content of its own -- just
// its permitted actions as buttons. (Stand is the one exception, with its
// own page for the assignments list.)
export async function SimpleRoleLandingPage({ role, label }: { role: UserRole; label: string }) {
  const profile = await requireProfile(["admin", role]);
  const supabase = createClient();
  const { allowedViews, pendingRequestCount, draftTypes } = await getRoleLandingData(supabase, role, profile.id);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">{label}</h1>
      <RoleActionButtons allowedViews={allowedViews} pendingRequestCount={pendingRequestCount} draftTypes={draftTypes} />
      {!allowedViews.size && (
        <p className="text-sm text-gray-500">
          No actions are currently enabled for this role. An admin can grant access at Admin → Permissions.
        </p>
      )}
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "./supabase/types";
import { getAllowedViewsForRole, type ViewKey } from "./permissions";
import { getDraftTypesForUser, type ActionDraftType } from "./actionDrafts";

// Shared by every role's landing page: what actions that role can see
// (from the role_view_permissions matrix), whether RequestQ has anything
// waiting, and which action forms this specific user has a saved draft for.
export async function getRoleLandingData(
  supabase: SupabaseClient,
  role: UserRole,
  userId: string
): Promise<{ allowedViews: Set<ViewKey>; pendingRequestCount: number; draftTypes: Set<ActionDraftType> }> {
  const allowedViews = await getAllowedViewsForRole(supabase, role);

  const [pendingRequestCount, draftTypes] = await Promise.all([
    allowedViews.has("restock_requests")
      ? supabase
          .from("inventory_thresholds")
          .select("id", { count: "exact", head: true })
          .not("requested_at", "is", null)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
    getDraftTypesForUser(supabase, userId),
  ]);

  return { allowedViews, pendingRequestCount, draftTypes };
}

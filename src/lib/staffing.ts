import type { LocationStaffRole, LocationStaffTier } from "./supabase/types";
import { STAFF_ROLES } from "./staffRoles";

// The single source of truth for "how many of a role are needed" — a
// tier match (scoped to the SAME location as the role, not just the
// same role name) overrides the role's base_count for the given
// attendance figure.
export function effectiveCount(
  role: LocationStaffRole,
  tiers: LocationStaffTier[],
  attendance: number | null
): { count: number; note: string | null } {
  let count = role.base_count;
  let note: string | null = null;

  if (attendance != null) {
    const tier = tiers.find(
      (t) =>
        t.location_id === role.location_id &&
        t.role_name === role.role_name &&
        attendance >= t.min_attendance &&
        (t.max_attendance == null || attendance < t.max_attendance)
    );
    if (tier) {
      count = tier.count;
      note = `tier: ${tier.min_attendance}${tier.max_attendance ? `–${tier.max_attendance}` : "+"} attendance`;
    }
  }

  return { count, note };
}

// Total recommended staff (fixed Lead + tier-driven roles) across a set
// of stand locations at a given attendance figure, honoring per-event
// open/closed overrides. Shared by the Event Detail page (EST vs TOT
// comparison) and the dashboard's WFM Shifts total.
export function totalRecommendedStaff(
  locationIds: string[],
  openByLocationId: Map<string, boolean>,
  rolesByLocationId: Map<string, LocationStaffRole[]>,
  tiers: LocationStaffTier[],
  attendance: number | null
): number {
  return locationIds.reduce((total, locationId) => {
    const isOpen = openByLocationId.get(locationId) ?? true;
    if (!isOpen) return total;
    const roles = rolesByLocationId.get(locationId) ?? [];
    const roleTotal = STAFF_ROLES.reduce((sum, roleName) => {
      const role = roles.find((r) => r.role_name === roleName);
      return role ? sum + effectiveCount(role, tiers, attendance).count : sum;
    }, 0);
    return total + 1 + roleTotal;
  }, 0);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "./supabase/types";

// The configurable, per-role "view" matrix -- each entry gates one
// top-level route. Admin isn't a row here: it always has every view (see
// getAllowedViewsForRole), so the matrix can't lock an admin out of the
// admin panel that manages it.
export const VIEW_KEYS = [
  { key: "count", label: "Count", href: "/count" },
  { key: "request", label: "Request", href: "/request" },
  { key: "transfer", label: "Transfer", href: "/transfer" },
  { key: "recovery", label: "Recovery", href: "/recovery" },
  { key: "return", label: "Return", href: "/return" },
  { key: "receive", label: "Receive", href: "/receive" },
  { key: "restock_requests", label: "RequestQ", href: "/restock-requests" },
] as const;

export type ViewKey = (typeof VIEW_KEYS)[number]["key"];

export const ROLES_IN_MATRIX: UserRole[] = ["warehouse", "kitchen", "catering", "ops", "stand_lead"];

// Each non-admin role has exactly one landing page -- a per-role "launcher"
// listing whatever actions role_view_permissions grants it. Ops/Admin are
// the exception: their landing page is the analytics Dashboard, not a
// launcher (Ops still gets a launcher too, at /operations, just not as
// their default landing route -- see landingPathForRole).
export const ROLE_SECTIONS: { role: UserRole; label: string; href: string }[] = [
  { role: "ops", label: "Operations", href: "/operations" },
  { role: "warehouse", label: "Warehouse", href: "/warehouse" },
  { role: "catering", label: "Catering", href: "/catering" },
  { role: "kitchen", label: "Kitchen", href: "/kitchen" },
  { role: "stand_lead", label: "Stand", href: "/stand" },
];

// Where a role lands after login / at "/". Admin and Ops go to the
// analytics Dashboard; every other role goes straight to its own launcher.
export function landingPathForRole(role: UserRole): string {
  if (role === "admin" || role === "ops") return "/dashboard";
  return ROLE_SECTIONS.find((s) => s.role === role)?.href ?? "/dashboard";
}

export async function getAllowedViewsForRole(supabase: SupabaseClient, role: UserRole): Promise<Set<ViewKey>> {
  if (role === "admin") return new Set(VIEW_KEYS.map((v) => v.key));

  const { data } = await supabase.from("role_view_permissions").select("view_key, allowed").eq("role", role);
  const allowed = new Set<ViewKey>();
  for (const row of (data as { view_key: string; allowed: boolean }[] | null) ?? []) {
    if (row.allowed) allowed.add(row.view_key as ViewKey);
  }
  return allowed;
}

// Maps a request path to the view_key that gates it, or null if the path
// isn't part of the configurable matrix (always reachable -- /dashboard,
// /checkin/*, /admin/* which has its own hardcoded admin-only gate, etc).
// Segment-aware so "/recovery" doesn't also match "/recoveries".
export function viewKeyForPath(pathname: string): ViewKey | null {
  for (const v of VIEW_KEYS) {
    if (pathname === v.href || pathname.startsWith(`${v.href}/`) || pathname.startsWith(`${v.href}?`)) {
      return v.key;
    }
  }
  return null;
}

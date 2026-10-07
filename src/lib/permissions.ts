import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "./supabase/types";

// The configurable, per-role "view" matrix -- each entry gates one route.
// Admin isn't a row here: it always has every view (see
// getAllowedViewsForRole), so the matrix can't lock an admin out of the
// admin panel that manages it.
//
// Entries with no `group` are the original inventory-moving action pages
// (Count, Request, Transfer, ...) -- fully usable by any role granted
// them, same as always. Entries with a `group` are admin-section pages
// (mirroring the admin left nav's SECTION_GROUPS) -- granting one of
// these only ever gives view access; only Admin can add/edit/delete/
// duplicate records on them (enforced per-page, not by this matrix).
// Users and Permissions are intentionally left out of both the matrix
// and the Access group below -- exposing admin/role management itself
// as a togglable checkbox risks a role locking admins out of the panel
// that controls it.
export const VIEW_KEYS = [
  { key: "count", label: "Count", href: "/count", group: null },
  { key: "month_end", label: "Month-End", href: "/month-end", group: null },
  { key: "request", label: "Request", href: "/request", group: null },
  { key: "recipe_request", label: "Recipe Request", href: "/request-recipe", group: null },
  { key: "transfer", label: "Transfer", href: "/transfer", group: null },
  { key: "recovery", label: "Recovery", href: "/recovery", group: null },
  { key: "return", label: "Return", href: "/return", group: null },
  { key: "receive", label: "Receive", href: "/receive", group: null },

  { key: "products", label: "Products", href: "/admin/products", group: "Catalog" },
  { key: "suppliers", label: "Suppliers", href: "/admin/suppliers", group: "Catalog" },
  { key: "categories", label: "Categories", href: "/admin/categories", group: "Catalog" },
  { key: "recipes", label: "Recipes", href: "/admin/recipes", group: "Catalog" },

  { key: "restock_requests", label: "RequestQ", href: "/restock-requests", group: "Operations" },
  { key: "purchase_orders", label: "Purchase Orders", href: "/admin/purchase-orders", group: "Operations" },
  { key: "admin_events", label: "Events", href: "/admin/events", group: "Operations" },
  { key: "locations", label: "Locations", href: "/admin/locations", group: "Operations" },
  { key: "storage_areas", label: "Storage Areas", href: "/admin/storage-areas", group: "Operations" },

  { key: "beo", label: "BEO", href: "/admin/catering/beo", group: "Catering" },

  { key: "reports_events", label: "Events", href: "/admin/reports/events", group: "Reports" },
  { key: "reports_month_end", label: "Month End", href: "/admin/month-end-reports", group: "Reports" },
  { key: "reports_year_end", label: "Year End", href: "/admin/reports/year-end", group: "Reports" },

  { key: "roster", label: "Roster", href: "/admin/roster", group: "Access" },

  { key: "yellow_dog_mapping", label: "Yellow Dog", href: "/admin/yellow-dog-mapping", group: "Data Maps" },
  { key: "square_pos_mapping", label: "Square POS", href: "/admin/square-pos-mapping", group: "Data Maps" },
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

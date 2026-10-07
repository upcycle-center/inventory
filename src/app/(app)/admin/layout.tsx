import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllowedViewsForRole, viewKeyForPath } from "@/lib/permissions";

const SECTION_GROUPS = [
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/suppliers", label: "Suppliers" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/recipes", label: "Recipes" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/restock-requests", label: "RequestQ" },
      { href: "/admin/purchase-orders", label: "Purchase Orders" },
      { href: "/admin/events", label: "Events" },
      { href: "/admin/locations", label: "Locations" },
      { href: "/admin/storage-areas", label: "Storage Areas" },
    ],
  },
  {
    label: "Catering",
    items: [{ href: "/admin/catering/beo", label: "BEO" }],
  },
  {
    label: "Reports",
    items: [
      { href: "/admin/reports/events", label: "Events" },
      { href: "/admin/month-end-reports", label: "Month End" },
      { href: "/admin/reports/year-end", label: "Year End" },
    ],
  },
  {
    label: "Access",
    items: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/permissions", label: "Permissions" },
      { href: "/admin/roster", label: "Roster" },
    ],
  },
  {
    label: "Data Maps",
    items: [
      { href: "/admin/yellow-dog-mapping", label: "Yellow Dog" },
      { href: "/admin/square-pos-mapping", label: "Square POS" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Any role can land here now -- middleware has already gated the
  // specific page being requested against the permissions matrix (Admin
  // always passes; Users/Permissions always fail for non-admin, since
  // they have no matrix entry). This layout only needs to trim the
  // sidebar to what the current role can actually reach.
  const profile = await requireProfile();
  const supabase = createClient();
  const allowedViews = profile.role === "admin" ? null : await getAllowedViewsForRole(supabase, profile.role);

  const visibleGroups = SECTION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!allowedViews) return true;
      const key = viewKeyForPath(item.href);
      return key != null && allowedViews.has(key);
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-6">
      <nav className="space-y-4 text-sm sm:w-36 sm:shrink-0">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
            <div className="flex flex-wrap gap-1 sm:block sm:space-y-1">
              {group.items.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded-md px-2 py-2 text-gray-600 hover:bg-gray-100 sm:block"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

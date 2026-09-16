import Link from "next/link";
import { requireProfile } from "@/lib/auth";

const SECTION_GROUPS = [
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/suppliers", label: "Suppliers" },
      { href: "/admin/storage-areas", label: "Storage Areas" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/locations", label: "Locations" },
      { href: "/admin/events", label: "Events" },
      { href: "/restock-requests", label: "RequestQ" },
      { href: "/comps", label: "Comps" },
      { href: "/recoveries", label: "Recoveries" },
    ],
  },
  {
    label: "Reports",
    items: [{ href: "/admin/month-end-reports", label: "Month-End Reports" }],
  },
  {
    label: "Access",
    items: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/permissions", label: "Permissions" },
    ],
  },
  {
    label: "Integrations",
    items: [{ href: "/admin/yellow-dog-mapping", label: "Yellow Dog CSV Mapping" }],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireProfile(["admin"]);

  return (
    <div className="flex gap-8">
      <nav className="w-48 shrink-0 space-y-4 text-sm">
        {SECTION_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="block rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}

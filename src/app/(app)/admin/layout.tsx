import Link from "next/link";
import { requireProfile } from "@/lib/auth";

const SECTIONS = [
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/storage-areas", label: "Storage Areas" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/products", label: "Products" },
  { href: "/restock-requests", label: "Restock Requests" },
  { href: "/comps", label: "Comps" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/yellow-dog-mapping", label: "Yellow Dog CSV Mapping" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireProfile(["admin"]);

  return (
    <div className="flex gap-8">
      <nav className="w-48 shrink-0 space-y-1 text-sm">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="block rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100"
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}

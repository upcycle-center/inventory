"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/supabase/types";
import { landingPathForRole, type ViewKey } from "@/lib/permissions";

// The header is organized by USER TYPE, not individual pages: each role
// has one section tab (its landing page, hosting whatever actions that
// role is permitted), Admin can see every section for oversight, and
// RequestQ stays its own top-level tab since Admin+Warehouse manage it
// directly rather than through a role landing page. Dashboard/Operations
// share the "ops" role since Ops's default landing is the analytics
// Dashboard, but Ops also gets its own action-launcher at /operations.
type NavLink =
  | { kind: "roles"; href: string; label: string; roles: UserRole[] }
  | { kind: "view"; href: string; label: string; viewKey: ViewKey }
  | { kind: "adminOnly"; href: string; label: string };

const LINKS: NavLink[] = [
  { kind: "roles", href: "/dashboard", label: "Dashboard", roles: ["admin", "ops"] },
  { kind: "view", href: "/restock-requests", label: "RequestQ", viewKey: "restock_requests" },
  { kind: "roles", href: "/warehouse", label: "Warehouse", roles: ["admin", "warehouse"] },
  { kind: "roles", href: "/stand", label: "Stand", roles: ["admin", "stand_lead"] },
  { kind: "roles", href: "/catering", label: "Catering", roles: ["admin", "catering"] },
  { kind: "roles", href: "/kitchen", label: "Kitchen", roles: ["admin", "kitchen"] },
  { kind: "roles", href: "/operations", label: "Operations", roles: ["admin", "ops"] },
  { kind: "adminOnly", href: "/admin", label: "Admin" },
];

export function Nav({ profile, allowedViews }: { profile: Profile; allowedViews: ViewKey[] }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const allowedSet = new Set(allowedViews);
  const visibleLinks = LINKS.filter((l) => {
    if (l.kind === "adminOnly") return profile.role === "admin";
    if (l.kind === "roles") return l.roles.includes(profile.role);
    return profile.role === "admin" || allowedSet.has(l.viewKey);
  });

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={landingPathForRole(profile.role)} className="font-semibold">
            BWP Legends Operations
          </Link>
          <nav className="flex gap-4 text-sm">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname.startsWith(link.href)
                    ? "font-medium text-brand"
                    : "text-gray-500 hover:text-gray-900"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>
            {profile.name} <span className="text-gray-400">({profile.role})</span>
          </span>
          <button onClick={handleSignOut} className="text-brand hover:underline">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

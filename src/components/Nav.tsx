"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import type { ViewKey } from "@/lib/permissions";

// Dashboard has no viewKey (always visible -- it's the required landing
// page). Admin is special-cased by role directly rather than through the
// view matrix, same as in middleware.
const LINKS: { href: string; label: string; viewKey?: ViewKey; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/count", label: "Count", viewKey: "count" },
  { href: "/receive", label: "Receive", viewKey: "receive" },
  { href: "/transfer", label: "Transfer", viewKey: "transfer" },
  { href: "/recovery", label: "Recovery", viewKey: "recovery" },
  { href: "/return", label: "Return", viewKey: "return" },
  { href: "/request", label: "Request", viewKey: "request" },
  { href: "/restock-requests", label: "RequestQ", viewKey: "restock_requests" },
  { href: "/admin", label: "Admin", adminOnly: true },
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
    if (l.adminOnly) return profile.role === "admin";
    if (!l.viewKey) return true;
    return profile.role === "admin" || allowedSet.has(l.viewKey);
  });

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">BWP Legends Operations</span>
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

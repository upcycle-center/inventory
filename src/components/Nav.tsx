"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/supabase/types";
import { landingPathForRole, type ViewKey } from "@/lib/permissions";

// The logo/app name doubles as the "Dashboard" link (it already goes to
// landingPathForRole -- /dashboard for Admin/Ops, the role's own launcher
// for everyone else), and RequestQ sits next to it as an always-visible
// top-level link since Admin+Warehouse manage it directly. Everything else
// USER-TYPE based (each role's landing page) lives in the hamburger menu,
// top right.
const MENU_LINKS: { kind: "roles"; href: string; label: string; roles: UserRole[] }[] = [
  { kind: "roles", href: "/warehouse", label: "Warehouse", roles: ["admin", "warehouse"] },
  { kind: "roles", href: "/stand", label: "Stand", roles: ["admin", "stand_lead"] },
  { kind: "roles", href: "/catering", label: "Catering", roles: ["admin", "catering"] },
  { kind: "roles", href: "/kitchen", label: "Kitchen", roles: ["admin", "kitchen"] },
  { kind: "roles", href: "/operations", label: "Operations", roles: ["admin", "ops"] },
  { kind: "roles", href: "/admin", label: "Admin", roles: ["admin"] },
];

export function Nav({ profile, allowedViews }: { profile: Profile; allowedViews: ViewKey[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    if (!confirm("Sign out?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const allowedSet = new Set(allowedViews);
  const showRequestQ = profile.role === "admin" || allowedSet.has("restock_requests");
  const visibleMenuLinks = MENU_LINKS.filter((l) => l.roles.includes(profile.role));

  return (
    <header className="relative border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href={landingPathForRole(profile.role)} className="font-semibold">
            BWP Legends Operations
          </Link>
          {showRequestQ && (
            <Link
              href="/restock-requests"
              className={
                pathname.startsWith("/restock-requests")
                  ? "hidden text-sm font-medium text-brand sm:inline"
                  : "hidden text-sm text-gray-500 hover:text-gray-900 sm:inline"
              }
            >
              RequestQ
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="hidden sm:inline">
              {profile.name} <span className="text-gray-400">({profile.role})</span>
            </span>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-md text-lg font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            >
              ✕
            </button>
          </div>

          {!!visibleMenuLinks.length && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                {open ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                  </svg>
                )}
              </button>

              {open && (
                <>
                  {/* Backdrop: click anywhere outside the menu to close it. */}
                  <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                  <nav className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                    {visibleMenuLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={
                          pathname.startsWith(link.href)
                            ? "block px-4 py-2 text-sm font-medium text-brand"
                            : "block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        }
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

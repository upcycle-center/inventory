"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

const LINKS: { href: string; label: string; roles?: Profile["role"][] }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/count", label: "Count", roles: ["admin", "stand_lead"] },
  { href: "/receive", label: "Receive", roles: ["admin", "warehouse", "kitchen", "catering"] },
  { href: "/transfer", label: "Transfer", roles: ["admin", "warehouse", "kitchen", "catering"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
];

export function Nav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const visibleLinks = LINKS.filter((l) => !l.roles || l.roles.includes(profile.role));

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">BWP Operations</span>
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

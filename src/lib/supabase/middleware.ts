import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "./types";
import { getAllowedViewsForRole, viewKeyForPath, landingPathForRole, ROLE_SECTIONS } from "../permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// /admin/* defaults to hardcoded admin-only -- EXCEPT for the specific
// admin pages listed in VIEW_KEYS (Catalog, Operations extras, Catering,
// Reports, Data Maps, Roster), which are matrix-gated like any other
// view below. Users and Permissions have no VIEW_KEYS entry, so they
// always fall through to this hard block -- exposing admin/role
// management itself as a togglable checkbox risks a role locking
// admins out of the panel that controls it.
const ADMIN_ONLY_PREFIXES = ["/admin"];

// Each role's landing page (/warehouse, /stand, etc.) is only for that role
// -- admin can browse into any of them for oversight, but e.g. a Catering
// user hitting /warehouse directly gets bounced, same as a non-admin
// hitting /admin.
function roleForLandingPrefix(pathname: string): UserRole | null {
  const entry = ROLE_SECTIONS.find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  return entry?.role ?? null;
}

async function roleAllows(supabase: SupabaseClient, role: UserRole, pathname: string): Promise<boolean> {
  if (role === "admin") return true;

  const landingRole = roleForLandingPrefix(pathname);
  if (landingRole) return role === landingRole;

  const viewKey = viewKeyForPath(pathname);
  if (viewKey) {
    const allowed = await getAllowedViewsForRole(supabase, role);
    return allowed.has(viewKey);
  }

  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return true;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/auth/resolve-username") ||
    pathname.startsWith("/api/auth/forgot-password");

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isPublicPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role ?? "stand_lead") as UserRole;
    if (!(await roleAllows(supabase, role, pathname))) {
      return NextResponse.redirect(new URL(landingPathForRole(role), request.url));
    }
  }

  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

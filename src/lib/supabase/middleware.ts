import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "./types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const ADMIN_ONLY_PREFIXES = ["/admin"];
const WAREHOUSE_PREFIXES = ["/receive", "/transfer", "/return"];

function roleAllows(role: UserRole, pathname: string): boolean {
  if (role === "admin") return true;
  if (WAREHOUSE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return role === "warehouse" || role === "kitchen" || role === "catering";
  }
  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    return false;
  }
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
    if (!roleAllows(role, pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

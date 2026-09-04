import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { landingPathForRole } from "@/lib/permissions";
import type { Profile, UserRole } from "@/lib/supabase/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export async function requireProfile(allowedRoles?: UserRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(profile.role)) redirect(landingPathForRole(profile.role));
  return profile;
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";

export async function updateUserRole(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as UserRole;
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/users");
}

export async function addCertificationType(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  // No roles checked = applies to everyone.
  const applicableRoles = formData.getAll("applicable_roles").map(String);

  const { count } = await supabase
    .from("certification_types")
    .select("*", { count: "exact", head: true });

  await supabase.from("certification_types").insert({
    name,
    sort_order: count ?? 0,
    applicable_roles: applicableRoles.length ? applicableRoles : null,
  });
  revalidatePath("/admin/users");
}

export async function toggleCertificationTypeActive(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("certification_types").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/users");
}

// Deactivating also bans the auth account so the person can't log in —
// otherwise "Deactivate" would only be cosmetic for someone who still
// holds a password. Reactivate lifts the ban.
export async function toggleUserActive(formData: FormData) {
  const requester = await requireProfile(["admin"]);
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  if (requester.id === id && active) return;

  const supabase = createClient();
  await supabase.from("profiles").update({ active: !active }).eq("id", id);

  const admin = createServiceRoleClient();
  await admin.auth.admin.updateUserById(id, {
    ban_duration: active ? "876000h" : "none",
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/inactive");
  revalidatePath(`/admin/users/${id}`);
}

export async function inviteUser(formData: FormData): Promise<{ message: string }> {
  await requireProfile(["admin"]);
  const email = String(formData.get("email") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "stand_lead") as UserRole;
  const password = String(formData.get("password") || "").trim();

  if (!email || !username || !password) {
    return { message: "Username, email, and a temporary password are required." };
  }

  const admin = createServiceRoleClient();

  const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) {
    return { message: `Username "${username}" is already taken.` };
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || email },
  });

  if (error || !created.user) {
    return { message: `Could not create user: ${error?.message ?? "unknown error"}` };
  }

  await admin.from("profiles").update({ role, name: name || email, username }).eq("id", created.user.id);

  revalidatePath("/admin/users");
  return { message: `Created ${username} (${email}) as ${role}.` };
}

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

export async function updateUserCertifications(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const certifications = String(formData.get("certifications") || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  await supabase.from("profiles").update({ certifications }).eq("id", id);
  revalidatePath("/admin/users");
}

export async function inviteUser(formData: FormData): Promise<{ message: string }> {
  await requireProfile(["admin"]);
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "stand_lead") as UserRole;
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    return { message: "Email and a temporary password are required." };
  }

  const admin = createServiceRoleClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || email },
  });

  if (error || !created.user) {
    return { message: `Could not create user: ${error?.message ?? "unknown error"}` };
  }

  await admin.from("profiles").update({ role, name: name || email }).eq("id", created.user.id);

  revalidatePath("/admin/users");
  return { message: `Created ${email} as ${role}.` };
}

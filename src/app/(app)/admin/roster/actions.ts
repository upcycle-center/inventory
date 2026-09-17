"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function createStaff(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  if (!firstName || !lastName) return;

  await supabase.from("staff").insert({
    first_name: firstName,
    last_name: lastName,
    main_role: String(formData.get("main_role") || "").trim() || null,
    cover_role: String(formData.get("cover_role") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
  });
  revalidatePath("/admin/roster");
}

export async function updateStaff(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  if (!id || !firstName || !lastName) return;

  const expiresRaw = String(formData.get("certification_expires_at") || "").trim();

  await supabase
    .from("staff")
    .update({
      first_name: firstName,
      last_name: lastName,
      main_role: String(formData.get("main_role") || "").trim() || null,
      cover_role: String(formData.get("cover_role") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      certified: formData.get("certified") === "on",
      certification_expires_at: expiresRaw || null,
      ready_to_work: formData.get("ready_to_work") === "on",
    })
    .eq("id", id);

  revalidatePath("/admin/roster");
  revalidatePath(`/admin/roster/${id}`);
}

export async function toggleStaffActive(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("staff").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/roster");
  revalidatePath(`/admin/roster/${id}`);
}

export async function deleteStaff(id: string): Promise<{ error: string } | void> {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("staff").delete().eq("id", id);

  if (error) {
    const message = error.message.toLowerCase().includes("foreign key")
      ? "Can't delete — this staff member has logged Call-Out/No-Show history. Deactivate instead."
      : error.message;
    return { error: message };
  }

  revalidatePath("/admin/roster");
  redirect("/admin/roster");
}

// Certification types are a shared catalog -- applicable_roles can hold
// either system UserRole values (for real login Users, managed here too
// since this moved from the Users page) or Roster role names (Bartender,
// Server Food, ...). Which audience a type serves is implicit in which
// vocabulary its applicable_roles values belong to.
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
    description: String(formData.get("description") || "").trim() || null,
    sort_order: count ?? 0,
    applicable_roles: applicableRoles.length ? applicableRoles : null,
  });
  revalidatePath("/admin/roster");
  revalidatePath("/admin/users");
}

export async function updateCertificationType(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return;

  const applicableRoles = formData.getAll("applicable_roles").map(String);

  await supabase
    .from("certification_types")
    .update({
      name,
      description: String(formData.get("description") || "").trim() || null,
      applicable_roles: applicableRoles.length ? applicableRoles : null,
    })
    .eq("id", id);

  revalidatePath("/admin/roster");
  revalidatePath(`/admin/roster/certifications/${id}`);
  revalidatePath("/admin/users");
}

export async function toggleCertificationTypeActive(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("certification_types").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/roster");
  revalidatePath(`/admin/roster/certifications/${id}`);
  revalidatePath("/admin/users");
}

export async function deleteCertificationType(id: string): Promise<{ error: string } | void> {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("certification_types").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/roster");
  revalidatePath("/admin/users");
  redirect("/admin/roster");
}

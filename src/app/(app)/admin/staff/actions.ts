"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function createStaff(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await supabase.from("staff").insert({ name });
  revalidatePath("/admin/staff");
}

export async function toggleStaffCertified(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const certified = formData.get("certified") === "true";
  await supabase.from("staff").update({ certified: !certified }).eq("id", id);
  revalidatePath("/admin/staff");
}

export async function toggleStaffReady(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const readyToWork = formData.get("ready_to_work") === "true";
  await supabase.from("staff").update({ ready_to_work: !readyToWork }).eq("id", id);
  revalidatePath("/admin/staff");
}

export async function toggleStaffActive(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("staff").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/staff");
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

  revalidatePath("/admin/staff");
}

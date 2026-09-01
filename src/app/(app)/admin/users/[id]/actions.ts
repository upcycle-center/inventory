"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";

export async function updateUserProfile(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const role = String(formData.get("role")) as UserRole;
  if (!id || !name) return;

  await supabase
    .from("profiles")
    .update({ name, phone: phone || null, role })
    .eq("id", id);

  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/users");
}

export async function setUserCertification(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const userId = String(formData.get("user_id"));
  const certificationTypeId = String(formData.get("certification_type_id"));
  const active = formData.get("active") === "on";
  const certifiedAt = String(formData.get("certified_at") || "").trim();
  const expiresAt = String(formData.get("expires_at") || "").trim();
  if (!userId || !certificationTypeId) return;

  if (!active) {
    await supabase
      .from("user_certifications")
      .delete()
      .eq("user_id", userId)
      .eq("certification_type_id", certificationTypeId);
  } else {
    await supabase.from("user_certifications").upsert(
      {
        user_id: userId,
        certification_type_id: certificationTypeId,
        certified_at: certifiedAt || null,
        expires_at: expiresAt || null,
      },
      { onConflict: "user_id,certification_type_id" }
    );
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

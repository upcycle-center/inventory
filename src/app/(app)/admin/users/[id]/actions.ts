"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";

export async function updateUserProfile(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const role = String(formData.get("role")) as UserRole;
  const receivesLowStockReport = formData.get("receives_low_stock_report") === "on";
  const lowStockReportEmail = String(formData.get("low_stock_report_email") || "").trim();
  if (!id || !name) return;

  await supabase
    .from("profiles")
    .update({
      name,
      phone: phone || null,
      role,
      receives_low_stock_report: receivesLowStockReport,
      low_stock_report_email: lowStockReportEmail || null,
    })
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

export async function deleteUser(id: string): Promise<{ error: string } | void> {
  const requester = await requireProfile(["admin"]);
  if (requester.id === id) {
    return { error: "You can't delete your own account." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    const message = /foreign key|violat/i.test(error.message)
      ? "Can't delete — this user has counts, assignments, or other records on file. Deactivate them instead."
      : error.message;
    return { error: message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/users/inactive");
  redirect("/admin/users");
}

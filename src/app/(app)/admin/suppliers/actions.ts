"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSupplier(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await supabase.from("suppliers").insert({
    name,
    representative_first_name: String(formData.get("representative_first_name") || "").trim() || null,
    representative_last_name: String(formData.get("representative_last_name") || "").trim() || null,
    representative_phone: String(formData.get("representative_phone") || "").trim() || null,
    representative_email: String(formData.get("representative_email") || "").trim() || null,
  });

  revalidatePath("/admin/suppliers");
}

export async function updateSupplier(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Company is required." };

  const field = (key: string) => String(formData.get(key) || "").trim() || null;

  const { error } = await supabase
    .from("suppliers")
    .update({
      name,
      account_number: field("account_number"),
      representative_first_name: field("representative_first_name"),
      representative_last_name: field("representative_last_name"),
      representative_phone: field("representative_phone"),
      representative_email: field("representative_email"),
      website: field("website"),
      office_phone: field("office_phone"),
      billing_first_name: field("billing_first_name"),
      billing_last_name: field("billing_last_name"),
      billing_phone: field("billing_phone"),
      billing_email: field("billing_email"),
      delivery_schedule: field("delivery_schedule"),
      logistics_notes: field("logistics_notes"),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/suppliers");
  revalidatePath(`/admin/suppliers/${id}`);
}

export async function deleteSupplier(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  await supabase.from("suppliers").delete().eq("id", id);
  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers");
}

export async function markSupplierReviewed(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  await supabase.from("suppliers").update({ needs_review: false }).eq("id", id);
  revalidatePath("/admin/suppliers");
}

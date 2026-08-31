"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createSupplier(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await supabase.from("suppliers").insert({
    name,
    contact_name: String(formData.get("contact_name") || "").trim() || null,
    contact_email: String(formData.get("contact_email") || "").trim() || null,
    contact_phone: String(formData.get("contact_phone") || "").trim() || null,
  });

  revalidatePath("/admin/suppliers");
}

export async function deleteSupplier(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  await supabase.from("suppliers").delete().eq("id", id);
  revalidatePath("/admin/suppliers");
}

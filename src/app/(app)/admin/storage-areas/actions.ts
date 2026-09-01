"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createStorageArea(formData: FormData) {
  const supabase = createClient();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  if (!code || !name) return;

  const { count } = await supabase
    .from("storage_areas")
    .select("*", { count: "exact", head: true });

  await supabase.from("storage_areas").insert({ code, name, sort_order: count ?? 0 });
  revalidatePath("/admin/storage-areas");
}

export async function toggleStorageAreaActive(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("storage_areas").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/storage-areas");
}

export async function updateStorageArea(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const name = String(formData.get("name") || "").trim();
  if (!id || !code || !name) return;

  await supabase.from("storage_areas").update({ code, name }).eq("id", id);
  revalidatePath("/admin/storage-areas");
  revalidatePath(`/admin/storage-areas/${id}`);
}

export async function deleteStorageArea(id: string): Promise<{ error: string } | void> {
  const supabase = createClient();
  const { error } = await supabase.from("storage_areas").delete().eq("id", id);

  if (error) {
    const message = error.message.toLowerCase().includes("foreign key")
      ? "Can't delete — products are assigned to this storage area. Deactivate it instead."
      : error.message;
    return { error: message };
  }

  revalidatePath("/admin/storage-areas");
  redirect("/admin/storage-areas");
}

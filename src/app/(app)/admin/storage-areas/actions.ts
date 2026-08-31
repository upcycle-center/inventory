"use server";

import { revalidatePath } from "next/cache";
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LocationType } from "@/lib/supabase/types";

export async function createLocation(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "stand") as LocationType;
  if (!name) return;

  await supabase.from("locations").insert({
    name,
    type,
    description: String(formData.get("description") || "").trim() || null,
  });

  revalidatePath("/admin/locations");
}

export async function toggleLocationActive(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await supabase.from("locations").update({ active: !active }).eq("id", id);
  revalidatePath("/admin/locations");
}

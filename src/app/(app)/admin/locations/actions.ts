"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LocationType } from "@/lib/supabase/types";

export async function createLocation(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "stand") as LocationType;
  const yellowDogCode = String(formData.get("yellow_dog_code") || "").trim();
  if (!name) return;

  await supabase.from("locations").insert({
    name,
    type,
    description: String(formData.get("description") || "").trim() || null,
    yellow_dog_code: yellowDogCode || null,
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

export async function updateYellowDogCode(formData: FormData): Promise<{ message: string }> {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const code = String(formData.get("yellow_dog_code") || "").trim();

  if (code && !/^\d{3}$/.test(code)) {
    return { message: "Code must be exactly 3 digits." };
  }

  const { error } = await supabase
    .from("locations")
    .update({ yellow_dog_code: code || null })
    .eq("id", id);

  if (error) {
    return { message: error.message.includes("unique") ? "That code is already used by another location." : error.message };
  }

  revalidatePath("/admin/locations");
  return { message: "Saved." };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
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
  revalidatePath(`/admin/locations/${id}`);
}

// Season status is distinct from `active` -- a closed-for-the-season
// location stays active/configured everywhere else, it's just skipped by
// the all-locations Blank Count Sheet. Same pill-toggle pattern as the
// WFM Shifts Open/Closed button on Event Detail, stamping who/when for
// the "Last updated by X on Y" line shown under the toggle.
export async function toggleLocationStatus(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id) return;

  await supabase
    .from("locations")
    .update({
      status: status === "open" ? "closed" : "open",
      status_updated_at: new Date().toISOString(),
      status_updated_by: profile.id,
    })
    .eq("id", id);

  revalidatePath("/admin/locations");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LocationType } from "@/lib/supabase/types";

export async function updateLocation(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "stand") as LocationType;
  if (!id || !name) return;

  const yellowDogCode = String(formData.get("yellow_dog_code") || "").trim();
  if (yellowDogCode && !/^\d{3}$/.test(yellowDogCode)) return;

  await supabase
    .from("locations")
    .update({
      name,
      type,
      description: String(formData.get("description") || "").trim() || null,
      yellow_dog_code: yellowDogCode || null,
    })
    .eq("id", id);

  revalidatePath(`/admin/locations/${id}`);
  revalidatePath("/admin/locations");
}

export async function addStaffRole(formData: FormData) {
  const supabase = createClient();
  const locationId = String(formData.get("location_id"));
  const roleName = String(formData.get("role_name") || "").trim();
  const baseCount = Number(formData.get("base_count") || 0);
  const requiredCertification = String(formData.get("required_certification") || "").trim();
  if (!locationId || !roleName) return;

  await supabase.from("location_staff_roles").upsert(
    {
      location_id: locationId,
      role_name: roleName,
      base_count: baseCount,
      required_certification: requiredCertification || null,
    },
    { onConflict: "location_id,role_name" }
  );

  revalidatePath(`/admin/locations/${locationId}`);
}

export async function removeStaffRole(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const locationId = String(formData.get("location_id"));
  await supabase.from("location_staff_roles").delete().eq("id", id);
  revalidatePath(`/admin/locations/${locationId}`);
}

export async function addStaffTier(formData: FormData) {
  const supabase = createClient();
  const locationId = String(formData.get("location_id"));
  const roleName = String(formData.get("role_name") || "").trim();
  const minAttendance = Number(formData.get("min_attendance") || 0);
  const maxAttendanceRaw = String(formData.get("max_attendance") || "").trim();
  const count = Number(formData.get("count") || 0);
  if (!locationId || !roleName) return;

  await supabase.from("location_staff_tiers").insert({
    location_id: locationId,
    role_name: roleName,
    min_attendance: minAttendance,
    max_attendance: maxAttendanceRaw ? Number(maxAttendanceRaw) : null,
    count,
  });

  revalidatePath(`/admin/locations/${locationId}`);
}

export async function removeStaffTier(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const locationId = String(formData.get("location_id"));
  await supabase.from("location_staff_tiers").delete().eq("id", id);
  revalidatePath(`/admin/locations/${locationId}`);
}

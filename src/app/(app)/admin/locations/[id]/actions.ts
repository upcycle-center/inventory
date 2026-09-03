"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
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

export async function updateDefaultLead(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const defaultLeadUserId = String(formData.get("default_lead_user_id") || "");
  if (!id) return;

  await supabase
    .from("locations")
    .update({ default_lead_user_id: defaultLeadUserId || null })
    .eq("id", id);

  revalidatePath(`/admin/locations/${id}`);
}

// Unlike Default Lead (a reference used to pre-fill the per-event Lead
// dropdown), Backup Lead grants real access -- is_assigned_to_stand
// checks this directly, so this person can run the stand for any event
// at this location without a separate per-event assignment.
export async function updateBackupLead(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const backupLeadUserId = String(formData.get("backup_lead_user_id") || "");
  if (!id) return;

  await supabase
    .from("locations")
    .update({ backup_lead_user_id: backupLeadUserId || null })
    .eq("id", id);

  revalidatePath(`/admin/locations/${id}`);
}

export async function deleteLocation(id: string): Promise<{ error: string } | void> {
  const supabase = createClient();
  const { error } = await supabase.from("locations").delete().eq("id", id);

  if (error) {
    const message = error.message.toLowerCase().includes("foreign key")
      ? "Can't delete — this location has counts, movements, or assignments on record. Deactivate it instead."
      : error.message;
    return { error: message };
  }

  revalidatePath("/admin/locations");
  redirect("/admin/locations");
}

export async function addStaffRole(formData: FormData) {
  const supabase = createClient();
  const locationId = String(formData.get("location_id"));
  const roleName = String(formData.get("role_name") || "").trim();
  const baseCount = Number(formData.get("base_count") || 0);
  if (!locationId || !roleName) return;

  await supabase.from("location_staff_roles").upsert(
    { location_id: locationId, role_name: roleName, base_count: baseCount, required_certification: null },
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

export async function upsertThreshold(formData: FormData) {
  const supabase = createClient();
  const locationId = String(formData.get("location_id"));
  const productId = String(formData.get("product_id"));
  const thresholdRaw = String(formData.get("reorder_threshold") || "").trim();
  if (!locationId || !productId) return;

  await supabase.from("inventory_thresholds").upsert(
    {
      location_id: locationId,
      product_id: productId,
      reorder_threshold: thresholdRaw ? Number(thresholdRaw) : 0,
    },
    { onConflict: "product_id,location_id" }
  );

  revalidatePath(`/admin/locations/${locationId}`);
}

// Posting a physical count is the deliberate "close the month" action —
// once posted, it's the authoritative moEND for that product/location/month
// and what next month's moSTART carries forward from.
export async function postMonthEndPhysicalCount(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const locationId = String(formData.get("location_id"));
  const productId = String(formData.get("product_id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const eachRaw = String(formData.get("physical_qty_each") || "").trim();
  const casesRaw = String(formData.get("physical_qty_cases") || "").trim();
  if (!locationId || !productId || !year || !month) return;
  if (!eachRaw && !casesRaw) return;

  await supabase.from("location_product_month_end").upsert(
    {
      location_id: locationId,
      product_id: productId,
      year,
      month,
      physical_qty_each: eachRaw ? Number(eachRaw) : null,
      physical_qty_cases: casesRaw ? Number(casesRaw) : null,
      counted_by: profile.id,
      counted_at: new Date().toISOString(),
    },
    { onConflict: "location_id,product_id,year,month" }
  );

  revalidatePath(`/admin/locations/${locationId}`);
}

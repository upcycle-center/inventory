"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function updateEventDetails(formData: FormData) {
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const attendanceRaw = String(formData.get("attendance") || "").trim();
  if (!eventId) return;

  await supabase
    .from("events")
    .update({ attendance: attendanceRaw ? Number(attendanceRaw) : null })
    .eq("id", eventId);

  revalidatePath(`/admin/events/${eventId}`);
}

export async function toggleLocationOpen(formData: FormData) {
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const locationId = String(formData.get("location_id"));
  const isOpen = String(formData.get("is_open")) === "true";
  if (!eventId || !locationId) return;

  await supabase
    .from("event_locations")
    .upsert(
      { event_id: eventId, location_id: locationId, is_open: !isOpen, updated_at: new Date().toISOString() },
      { onConflict: "event_id,location_id" }
    );

  revalidatePath(`/admin/events/${eventId}`);
}

async function isConfirmed(supabase: ReturnType<typeof createClient>, eventId: string, locationId: string) {
  const { data } = await supabase
    .from("event_locations")
    .select("confirmed")
    .eq("event_id", eventId)
    .eq("location_id", locationId)
    .maybeSingle();
  return data?.confirmed ?? false;
}

export async function setLocationLead(formData: FormData) {
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const locationId = String(formData.get("location_id"));
  const locationLeadUserId = String(formData.get("location_lead_user_id") || "");
  if (!eventId || !locationId) return;
  if (await isConfirmed(supabase, eventId, locationId)) return;

  if (!locationLeadUserId) {
    await supabase
      .from("event_location_assignments")
      .delete()
      .eq("event_id", eventId)
      .eq("location_id", locationId);
  } else {
    await supabase
      .from("event_location_assignments")
      .upsert(
        { event_id: eventId, location_id: locationId, location_lead_user_id: locationLeadUserId },
        { onConflict: "event_id,location_id" }
      );
  }

  revalidatePath(`/admin/events/${eventId}`);
}

export async function confirmLocationStaffing(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const locationId = String(formData.get("location_id"));
  const staffCount = Number(formData.get("staff_count") || 0);
  if (!eventId || !locationId) return;

  await supabase.from("event_locations").upsert(
    {
      event_id: eventId,
      location_id: locationId,
      confirmed: true,
      confirmed_staff_count: staffCount,
      confirmed_at: new Date().toISOString(),
      confirmed_by: profile.id,
    },
    { onConflict: "event_id,location_id" }
  );

  revalidatePath(`/admin/events/${eventId}`);
}

export async function unlockLocationStaffing(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const locationId = String(formData.get("location_id"));
  if (!eventId || !locationId) return;

  await supabase
    .from("event_locations")
    .update({ confirmed: false })
    .eq("event_id", eventId)
    .eq("location_id", locationId);

  revalidatePath(`/admin/events/${eventId}`);
}

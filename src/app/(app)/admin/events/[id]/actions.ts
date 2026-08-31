"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateEventDetails(formData: FormData) {
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const attendanceRaw = String(formData.get("attendance") || "").trim();
  const teamSizeRaw = String(formData.get("team_size") || "").trim();
  if (!eventId) return;

  await supabase
    .from("events")
    .update({
      attendance: attendanceRaw ? Number(attendanceRaw) : null,
      team_size: teamSizeRaw ? Number(teamSizeRaw) : null,
    })
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

export async function assignLocationLead(formData: FormData) {
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const locationId = String(formData.get("location_id"));
  const locationLeadUserId = String(formData.get("location_lead_user_id"));
  if (!eventId || !locationId || !locationLeadUserId) return;

  await supabase
    .from("event_location_assignments")
    .upsert(
      { event_id: eventId, location_id: locationId, location_lead_user_id: locationLeadUserId },
      { onConflict: "event_id,location_id" }
    );

  revalidatePath(`/admin/events/${eventId}`);
}

export async function removeAssignment(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  await supabase.from("event_location_assignments").delete().eq("id", id);
  revalidatePath(`/admin/events/${eventId}`);
}

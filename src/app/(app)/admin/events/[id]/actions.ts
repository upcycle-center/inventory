"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

// One save for the whole attendance card (EST/TOT Tickets, GRN Room, VIP
// Lounge) instead of a button per field. These numbers change fast and get
// updated by whoever has the latest count, so every save stamps
// attendance_updated_at/by for a single trustworthy "Last updated by X on
// Y" line. Saving a TOT Tickets value here also counts as "posting" it
// (tot_tickets_posted_at/by), which is what unlocks the EST-vs-TOT
// over/under staffing comparison below — clearing the field un-posts it.
export async function updateEventAttendance(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  if (!eventId) return;

  const estRaw = String(formData.get("est_tickets") || "").trim();
  const totRaw = String(formData.get("tot_tickets") || "").trim();
  const grnRaw = String(formData.get("grn_room_attendance") || "").trim();
  const vipRaw = String(formData.get("vip_lounge_attendance") || "").trim();
  const now = new Date().toISOString();

  await supabase
    .from("events")
    .update({
      est_tickets: estRaw ? Number(estRaw) : null,
      tot_tickets: totRaw ? Number(totRaw) : null,
      tot_tickets_posted_at: totRaw ? now : null,
      tot_tickets_posted_by: totRaw ? profile.id : null,
      grn_room_attendance: grnRaw ? Number(grnRaw) : null,
      vip_lounge_attendance: vipRaw ? Number(vipRaw) : null,
      attendance_updated_at: now,
      attendance_updated_by: profile.id,
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/staffRoles";

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

// The WFM Shifts table's role columns are editable number inputs
// (pre-filled with the suggested/last-confirmed count) up until Confirm is
// clicked -- this reads one role_count_<role> field per STAFF_ROLES entry
// and stores the whole breakdown, not just the aggregate total.
export async function confirmLocationStaffing(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const locationId = String(formData.get("location_id"));
  if (!eventId || !locationId) return;

  const roleCounts: Record<string, number> = {};
  const roleBaselines: Record<string, number> = {};
  for (const roleName of STAFF_ROLES) {
    roleCounts[roleName] = Math.max(0, Number(formData.get(`role_count_${roleName}`) || 0));
    roleBaselines[roleName] = Math.max(0, Number(formData.get(`role_baseline_${roleName}`) || 0));
  }
  const staffCount = 1 + Object.values(roleCounts).reduce((sum, n) => sum + n, 0);

  const { data: existing } = await supabase
    .from("event_locations")
    .select("pending_unlock_reason")
    .eq("event_id", eventId)
    .eq("location_id", locationId)
    .maybeSingle();

  // A pending reason (set when this was last unlocked -- Call-Out,
  // No-Show, or a plain Adjustment) means: log it now, for whichever
  // role(s) came down from the baseline each field started from
  // (submitted as role_baseline_<role> -- the last confirmed count, or
  // the suggested count on a first-ever confirm, whichever the manager
  // actually saw and edited from). The edit itself is the record of what
  // happened -- no separate "which role" picker.
  const reason = existing?.pending_unlock_reason;
  if (reason === "call_out" || reason === "no_show" || reason === "other") {
    const callOutRows = STAFF_ROLES.filter((roleName) => roleCounts[roleName] < roleBaselines[roleName]).map((roleName) => ({
      event_id: eventId,
      location_id: locationId,
      role_name: roleName,
      call_out_type: reason,
      note: `${roleBaselines[roleName]} → ${roleCounts[roleName]} on reconfirm`,
      reported_by: profile.id,
    }));
    if (callOutRows.length) {
      const { error: callOutError } = await supabase.from("shift_call_outs").insert(callOutRows);
      if (callOutError) console.error("Failed to log shift call-out:", callOutError.message);
    }
  }

  const { error } = await supabase.from("event_locations").upsert(
    {
      event_id: eventId,
      location_id: locationId,
      confirmed: true,
      confirmed_staff_count: staffCount,
      confirmed_role_counts: roleCounts,
      confirmed_at: new Date().toISOString(),
      confirmed_by: profile.id,
      pending_unlock_reason: null,
    },
    { onConflict: "event_id,location_id" }
  );
  if (error) console.error("Failed to confirm location staffing:", error.message);

  revalidatePath(`/admin/events/${eventId}`);
}

// Unlocking re-opens the role columns for editing and records why, so the
// next Confirm knows whether to treat a reduced role count as a real
// Call-Out/No-Show (logged automatically) or just a correction.
export async function unlockLocationStaffing(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const eventId = String(formData.get("event_id"));
  const locationId = String(formData.get("location_id"));
  if (!eventId || !locationId) return;

  const reasonRaw = String(formData.get("reason") || "");
  const reason = reasonRaw === "call_out" || reasonRaw === "no_show" || reasonRaw === "other" ? reasonRaw : null;

  const { error } = await supabase
    .from("event_locations")
    .update({ confirmed: false, pending_unlock_reason: reason })
    .eq("event_id", eventId)
    .eq("location_id", locationId);
  if (error) console.error("Failed to unlock location staffing:", error.message);

  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteShiftCallOut(formData: FormData) {
  await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  if (!id || !eventId) return;

  await supabase.from("shift_call_outs").delete().eq("id", id);

  revalidatePath(`/admin/events/${eventId}`);
}

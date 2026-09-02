"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { EventStatus } from "@/lib/supabase/types";

export async function createEvent(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  const eventDate = String(formData.get("event_date") || "");
  if (!name || !eventDate) return;

  await supabase.from("events").insert({ name, event_date: eventDate });
  revalidatePath("/admin/events");
}

export async function updateEventStatus(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as EventStatus;
  await supabase.from("events").update({ status }).eq("id", id);
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
}

// Every table that references an event (assignments, counts, waste,
// event_locations, etc.) cascades on delete, so this permanently removes
// all of that event's staffing/count history too — admin-only, and the
// button confirms before calling this.
export async function deleteEvent(id: string): Promise<{ error: string } | void> {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

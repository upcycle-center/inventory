"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

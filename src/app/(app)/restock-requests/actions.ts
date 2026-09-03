"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function fulfillRestockRequest(formData: FormData) {
  await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

// Removes a request from the queue without it being fulfilled -- a
// mistaken entry, duplicate, or no-longer-needed request. Same effect on
// the record as fulfilling (it drops out of the queue either way), just
// the button someone reaches for when nothing was actually restocked.
export async function deleteRestockRequest(formData: FormData) {
  await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

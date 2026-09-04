"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DENIAL_REASONS } from "@/lib/denialReasons";

export async function fulfillRestockRequest(formData: FormData) {
  await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

// Denying keeps a reason on file (request_denials) instead of the request
// just silently vanishing from the queue -- the alternative to Delete for
// Warehouse, which doesn't get a no-reason-given removal option.
export async function denyRestockRequest(formData: FormData): Promise<void> {
  const profile = await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const reasonCode = String(formData.get("reason_code") || "");
  if (!id) return;
  if (!(DENIAL_REASONS as readonly { code: string }[]).some((r) => r.code === reasonCode)) return;

  const { data: threshold } = await supabase
    .from("inventory_thresholds")
    .select("product_id, location_id, reorder_threshold, requested_by, requested_at")
    .eq("id", id)
    .single();
  if (!threshold) return;

  await supabase.from("request_denials").insert({
    product_id: threshold.product_id,
    location_id: threshold.location_id,
    reorder_threshold: threshold.reorder_threshold,
    requested_by: threshold.requested_by,
    requested_at: threshold.requested_at,
    reason_code: reasonCode,
    denied_by: profile.id,
  });

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

// Admin-only: a true no-reason-given removal for a mistaken or duplicate
// entry. Warehouse uses Deny instead, which keeps a reason on file.
export async function deleteRestockRequest(formData: FormData) {
  await requireProfile(["admin"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase.from("inventory_thresholds").update({ requested_at: null, requested_by: null }).eq("id", id);

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
}

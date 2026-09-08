"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { DENIAL_REASONS } from "@/lib/denialReasons";

// Fulfilling logs the drop (request_fulfillments) with who/when and how
// much actually went out -- fulfilled_qty defaults to the full requested
// reorder_qty (a plain "Confirm"), or the fulfiller can post an adjusted
// number for a partial drop. fulfillment_pct is fixed at fulfillment time.
export async function fulfillRestockRequest(formData: FormData): Promise<void> {
  const profile = await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  const { data: threshold } = await supabase
    .from("inventory_thresholds")
    .select("product_id, location_id, reorder_qty, requested_by, requested_at")
    .eq("id", id)
    .single();
  if (!threshold) return;

  const requestedQty = threshold.reorder_qty ?? 0;
  const adjustedRaw = String(formData.get("fulfilled_qty") || "").trim();
  const fulfilledQty = adjustedRaw ? Number(adjustedRaw) : requestedQty;
  if (!Number.isFinite(fulfilledQty) || fulfilledQty < 0) return;
  const fulfillmentPct = requestedQty > 0 ? Math.round((fulfilledQty / requestedQty) * 10000) / 100 : 100;

  await supabase.from("request_fulfillments").insert({
    product_id: threshold.product_id,
    location_id: threshold.location_id,
    requested_qty: requestedQty,
    fulfilled_qty: fulfilledQty,
    fulfillment_pct: fulfillmentPct,
    requested_by: threshold.requested_by,
    requested_at: threshold.requested_at,
    fulfilled_by: profile.id,
  });

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

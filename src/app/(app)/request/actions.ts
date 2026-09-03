"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { saveDraft, clearDraft } from "@/lib/actionDrafts";

export async function saveRequestDraft(formData: FormData): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  const supabase = createClient();

  const draft = {
    product_id: String(formData.get("product_id") || ""),
    location_id: String(formData.get("location_id") || ""),
    reorder_qty: String(formData.get("reorder_qty") || ""),
  };

  const res = await saveDraft(supabase, profile.id, "request", draft);
  if (res?.error) return res;

  revalidatePath("/request");
  revalidatePath("/dashboard");
}

// Flags the same (location, product) threshold row the Assigned Items
// checkbox uses -- it lands in the exact same Restock Requests queue,
// this is just a friendlier standalone entry point for anyone, not only
// admins working from a location's product table.
export async function submitRequest(formData: FormData): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  const supabase = createClient();

  const productId = String(formData.get("product_id") || "");
  const locationId = String(formData.get("location_id") || "");
  const qtyRaw = String(formData.get("reorder_qty") || "").trim();

  if (!productId || !locationId) {
    return { error: "Product and location are required." };
  }
  if (qtyRaw && !(Number(qtyRaw) > 0)) {
    return { error: "Quantity must be greater than 0." };
  }

  const upsertData: Record<string, unknown> = {
    product_id: productId,
    location_id: locationId,
    requested_at: new Date().toISOString(),
    requested_by: profile.id,
  };
  if (qtyRaw) upsertData.reorder_qty = Number(qtyRaw);

  const { error } = await supabase
    .from("inventory_thresholds")
    .upsert(upsertData, { onConflict: "product_id,location_id" });

  if (error) {
    return { error: error.message };
  }

  await clearDraft(supabase, profile.id, "request");

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
  revalidatePath("/request");
}

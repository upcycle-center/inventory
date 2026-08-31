"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertThreshold(formData: FormData) {
  const supabase = createClient();
  const productId = String(formData.get("product_id"));
  const locationId = String(formData.get("location_id"));
  const reorderThreshold = Number(formData.get("reorder_threshold") || 0);
  const reorderQty = Number(formData.get("reorder_qty") || 0);
  if (!productId || !locationId) return;

  await supabase.from("inventory_thresholds").upsert(
    {
      product_id: productId,
      location_id: locationId,
      reorder_threshold: reorderThreshold,
      reorder_qty: reorderQty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id,location_id" }
  );

  revalidatePath("/admin/thresholds");
}

export async function deleteThreshold(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id"));
  await supabase.from("inventory_thresholds").delete().eq("id", id);
  revalidatePath("/admin/thresholds");
}

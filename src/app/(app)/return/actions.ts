"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export const RETURN_REASONS = ["Wrong Item", "Broken/Damaged", "Expired", "Did Not Order", "Other"] as const;

export async function submitReturn(formData: FormData): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  const supabase = createClient();

  const productId = String(formData.get("product_id") || "");
  const fromLocationId = String(formData.get("from_location_id") || "");
  const supplierId = String(formData.get("supplier_id") || "");
  const reasonCode = String(formData.get("reason_code") || "");
  const quantityRaw = String(formData.get("quantity") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!productId || !fromLocationId || !supplierId || !reasonCode) {
    return { error: "Product, location, supplier, and reason are all required." };
  }
  const quantity = Number(quantityRaw);
  if (!quantityRaw || !(quantity > 0)) {
    return { error: "Enter a quantity greater than 0." };
  }
  if (!(RETURN_REASONS as readonly string[]).includes(reasonCode)) {
    return { error: "Pick a valid reason." };
  }

  const { error } = await supabase.from("inventory_movements").insert({
    product_id: productId,
    from_location_id: fromLocationId,
    to_location_id: null,
    supplier_id: supplierId,
    type: "return",
    quantity,
    reason_code: reasonCode,
    note: note || null,
    user_id: profile.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/return");
}

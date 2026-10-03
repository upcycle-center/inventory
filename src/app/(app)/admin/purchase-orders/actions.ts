"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { PoStatus } from "@/lib/supabase/types";

const PO_STATUSES: PoStatus[] = ["requested", "placed", "received", "canceled"];

export async function updatePurchaseOrderStatus(formData: FormData) {
  await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as PoStatus;
  if (!id || !PO_STATUSES.includes(status)) return;

  await supabase.from("purchase_orders").update({ status }).eq("id", id);
  revalidatePath("/admin/purchase-orders");
}

export async function removePurchaseOrderItem(formData: FormData) {
  await requireProfile(["admin", "warehouse"]);
  const supabase = createClient();
  const id = String(formData.get("id"));
  if (!id) return;

  await supabase.from("purchase_order_items").delete().eq("id", id);
  revalidatePath("/admin/purchase-orders");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { saveDraft, clearDraft } from "@/lib/actionDrafts";
import { eachEquivalent } from "@/lib/onHand";

export interface RequestLineInput {
  product_id: string;
  qty_cases: number;
  qty_each: number;
  case_size: number | null;
}

export async function saveRequestDraft(locationId: string, lines: RequestLineInput[]): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  if (!locationId) return { error: "Select a location first." };
  const supabase = createClient();

  const res = await saveDraft(supabase, profile.id, "request", { location_id: locationId, lines });
  if (res?.error) return res;

  revalidatePath("/request");
  revalidatePath("/dashboard");
}

// Flags the same (location, product) threshold rows the Assigned Items
// checkbox uses -- lands in the exact same Restock Requests queue, this
// is just a friendlier standalone entry point for anyone, not only
// admins working from a location's product table. reorder_qty is stored
// as an each-equivalent, same convention used everywhere else quantities
// get compared (thresholds, low-stock report).
export async function submitRequest(locationId: string, lines: RequestLineInput[]): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "kitchen", "catering"]);
  const supabase = createClient();

  if (!locationId) {
    return { error: "Select a location first." };
  }
  const nonZero = lines.filter((l) => l.qty_cases > 0 || l.qty_each > 0);
  if (!nonZero.length) {
    return { error: "Set a quantity for at least one product." };
  }

  const rows = nonZero.map((l) => ({
    product_id: l.product_id,
    location_id: locationId,
    reorder_qty: eachEquivalent(l.qty_each, l.qty_cases, l.case_size),
    requested_at: new Date().toISOString(),
    requested_by: profile.id,
  }));

  const { error } = await supabase.from("inventory_thresholds").upsert(rows, { onConflict: "product_id,location_id" });

  if (error) {
    return { error: error.message };
  }

  await clearDraft(supabase, profile.id, "request");

  revalidatePath("/restock-requests");
  revalidatePath("/dashboard");
  revalidatePath("/request");
}

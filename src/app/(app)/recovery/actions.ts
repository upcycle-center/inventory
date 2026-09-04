"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { saveDraft, clearDraft } from "@/lib/actionDrafts";
import { eachEquivalent } from "@/lib/onHand";

export interface RecoveryLineInput {
  product_id: string;
  qty_cases: number;
  qty_each: number;
  case_size: number | null;
}

export async function saveRecoveryDraft(
  fromLocationId: string,
  toLocationId: string,
  lines: RecoveryLineInput[]
): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  if (!fromLocationId || !toLocationId) return { error: "Select a From and To warehouse first." };
  const supabase = createClient();

  const res = await saveDraft(supabase, profile.id, "recovery", {
    from_location_id: fromLocationId,
    to_location_id: toLocationId,
    lines,
  });
  if (res?.error) return res;

  revalidatePath("/recovery");
  revalidatePath("/dashboard");
}

export async function cancelRecoveryDraft(): Promise<void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  await clearDraft(supabase, profile.id, "recovery");

  revalidatePath("/recovery");
  revalidatePath("/dashboard");
}

// Recovery is a Transfer that's always headed back to a warehouse -- kept
// as its own movement type (not just a Transfer to a warehouse location)
// so it's separately reportable, the way month/quarter/year-end
// stand-closeout pulls need to be.
export async function submitRecovery(
  fromLocationId: string,
  toLocationId: string,
  lines: RecoveryLineInput[]
): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  if (!fromLocationId || !toLocationId) {
    return { error: "Select a From and To warehouse first." };
  }
  if (fromLocationId === toLocationId) {
    return { error: "From and To locations must be different." };
  }

  const { data: toLocation } = await supabase.from("locations").select("type").eq("id", toLocationId).single();
  if (toLocation?.type !== "warehouse") {
    return { error: "Recoveries must go to a warehouse location." };
  }

  const nonZero = lines.filter((l) => l.qty_cases > 0 || l.qty_each > 0);
  if (!nonZero.length) {
    return { error: "Set a quantity for at least one product." };
  }

  const rows = nonZero.map((l) => ({
    product_id: l.product_id,
    from_location_id: fromLocationId,
    to_location_id: toLocationId,
    type: "recovery" as const,
    quantity: eachEquivalent(l.qty_each, l.qty_cases, l.case_size),
    qty_cases: l.qty_cases,
    qty_each: l.qty_each,
    user_id: profile.id,
  }));

  const { error } = await supabase.from("inventory_movements").insert(rows);

  if (error) {
    return { error: error.message };
  }

  await clearDraft(supabase, profile.id, "recovery");

  revalidatePath("/recovery");
  revalidatePath("/recoveries");
  revalidatePath("/dashboard");
}

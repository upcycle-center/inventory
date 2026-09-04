"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { saveDraft, clearDraft } from "@/lib/actionDrafts";
import { eachEquivalent } from "@/lib/onHand";

export interface TransferLineInput {
  product_id: string;
  qty_cases: number;
  qty_each: number;
  case_size: number | null;
}

export async function saveTransferDraft(
  fromLocationId: string,
  toLocationId: string,
  lines: TransferLineInput[]
): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  if (!fromLocationId || !toLocationId) return { error: "Select a From and To location first." };
  const supabase = createClient();

  const res = await saveDraft(supabase, profile.id, "transfer", {
    from_location_id: fromLocationId,
    to_location_id: toLocationId,
    lines,
  });
  if (res?.error) return res;

  revalidatePath("/transfer");
  revalidatePath("/dashboard");
}

export async function cancelTransferDraft(): Promise<void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  await clearDraft(supabase, profile.id, "transfer");

  revalidatePath("/transfer");
  revalidatePath("/dashboard");
}

export async function submitTransfer(
  fromLocationId: string,
  toLocationId: string,
  lines: TransferLineInput[]
): Promise<{ error: string } | void> {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering", "ops"]);
  const supabase = createClient();

  if (!fromLocationId || !toLocationId) {
    return { error: "Select a From and To location first." };
  }
  if (fromLocationId === toLocationId) {
    return { error: "From and To locations must be different." };
  }
  const nonZero = lines.filter((l) => l.qty_cases > 0 || l.qty_each > 0);
  if (!nonZero.length) {
    return { error: "Set a quantity for at least one product." };
  }

  const rows = nonZero.map((l) => ({
    product_id: l.product_id,
    from_location_id: fromLocationId,
    to_location_id: toLocationId,
    type: "transfer" as const,
    quantity: eachEquivalent(l.qty_each, l.qty_cases, l.case_size),
    qty_cases: l.qty_cases,
    qty_each: l.qty_each,
    user_id: profile.id,
  }));

  const { error } = await supabase.from("inventory_movements").insert(rows);

  if (error) {
    return { error: error.message };
  }

  await clearDraft(supabase, profile.id, "transfer");

  revalidatePath("/transfer");
  revalidatePath("/dashboard");
}

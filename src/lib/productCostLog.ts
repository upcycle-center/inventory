import type { SupabaseClient } from "@supabase/supabase-js";

// Logs a case_cost change against whatever it was before, so a price
// that came in different from what's on file shows up as a reviewable
// variance -- without needing a real Receiving workflow to hook into.
// A no-op when the cost didn't actually change (including null -> null).
export async function logCostChange(
  supabase: SupabaseClient,
  params: {
    productId: string;
    previousCost: number | null;
    newCost: number | null;
    source: "manual_edit" | "csv_upload";
    changedBy: string | null;
  }
): Promise<void> {
  const { productId, previousCost, newCost, source, changedBy } = params;
  if (newCost == null || previousCost === newCost) return;

  const variance = previousCost != null ? newCost - previousCost : null;
  const variancePct = previousCost ? (variance! / previousCost) * 100 : null;

  await supabase.from("product_cost_log").insert({
    product_id: productId,
    previous_cost: previousCost,
    new_cost: newCost,
    variance,
    variance_pct: variancePct,
    source,
    changed_by: changedBy,
  });
}

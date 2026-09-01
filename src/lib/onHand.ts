import type { SupabaseClient } from "@supabase/supabase-js";

// Total quantity in "each" units, converting cases via the product's case
// size (defaulting to 1 if the product has no case size on file) — the
// single comparable number used to check on-hand against a threshold.
export function eachEquivalent(
  each: number | null | undefined,
  cases: number | null | undefined,
  caseSize: number | null | undefined
): number {
  return (each ?? 0) + (cases ?? 0) * (caseSize ?? 1);
}

export type CountLine = { product_id: string; qty_each: number | null; qty_cases: number | null; counted_at: string };

// Every count line ever submitted for a location, across all events —
// the shared source for On-Hand, moSTART, and moEND on the Location
// Details page (each of those just picks a different line out of this set).
export async function getLocationCountLines(supabase: SupabaseClient, locationId: string): Promise<CountLine[]> {
  const { data: countsHere } = await supabase
    .from("location_counts")
    .select("id")
    .eq("location_id", locationId);
  const countIds = ((countsHere as { id: string }[] | null) ?? []).map((c) => c.id);

  if (!countIds.length) return [];

  const { data: countLines } = await supabase
    .from("location_count_lines")
    .select("product_id, qty_each, qty_cases, counted_at")
    .in("location_count_id", countIds);

  return (countLines as CountLine[] | null) ?? [];
}

// The most recently counted qty per product, from any event's count.
export function latestByProductId(lines: CountLine[]): Map<string, CountLine> {
  const onHandByProductId = new Map<string, CountLine>();
  for (const line of lines) {
    const existing = onHandByProductId.get(line.product_id);
    if (!existing || line.counted_at > existing.counted_at) {
      onHandByProductId.set(line.product_id, line);
    }
  }
  return onHandByProductId;
}

// Convenience wrapper for callers that only need current On-Hand, not the
// full line history (e.g. the restock-requests page, the cron report).
export async function getOnHandByProductId(
  supabase: SupabaseClient,
  locationId: string
): Promise<Map<string, CountLine>> {
  return latestByProductId(await getLocationCountLines(supabase, locationId));
}

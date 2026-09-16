import type { SupabaseClient } from "@supabase/supabase-js";

// case_size means "each per case" for a normal Case/Each product -- but
// once a product has a middle unit (a Sleeve, a Pack), what's entered in
// Case size is "middle units per case" instead (e.g. 20 packs/case of 50
// each = 1,000 each/case), so it has to multiply through the middle unit
// size to get the real each-per-case. No middle unit -> case_size already
// IS each-per-case, unchanged from before. Returns null (not a guessed
// fallback) when case_size itself isn't set -- callers decide what an
// unknown case size should default to.
export function caseSizeInEach(caseSize: number | null | undefined, middleUnitSize: number | null | undefined): number | null {
  if (caseSize == null) return null;
  return middleUnitSize ? caseSize * middleUnitSize : caseSize;
}

// Total quantity in "each" units — the single comparable number used to
// check on-hand against a threshold. middle/middleUnitSize are optional so
// every existing call site (products with no middle tier) is unaffected.
// An unset case_size defaults to 1 each/case here so a "case" quantity
// still counts as something rather than vanishing to zero.
export function eachEquivalent(
  each: number | null | undefined,
  cases: number | null | undefined,
  caseSize: number | null | undefined,
  middle?: number | null,
  middleUnitSize?: number | null
): number {
  return (each ?? 0) + (middle ?? 0) * (middleUnitSize ?? 0) + (cases ?? 0) * (caseSizeInEach(caseSize, middleUnitSize) ?? 1);
}

export type CountLine = {
  product_id: string;
  qty_each: number | null;
  qty_cases: number | null;
  qty_middle_unit: number | null;
  counted_at: string;
};

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
    .select("product_id, qty_each, qty_cases, qty_middle_unit, counted_at")
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

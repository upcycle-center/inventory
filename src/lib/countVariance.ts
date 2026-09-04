import type { SupabaseClient } from "@supabase/supabase-js";
import { eachEquivalent } from "./onHand";
import { unitCosts } from "./inventoryValue";

// countVAR: for every closing count immediately followed by the next
// opening count at the same location, the opening count is the physical
// count overwrite -- ground truth. What the system expects to see instead
// is the prior closing count plus whatever moved in/out since (Transfer,
// Recovery) between those two timestamps. The gap between the two is the
// unexplained over/under. Target is zero.
export interface LocationVariance {
  varQty: number; // sum of (actual opening - expected carry-over), each-equivalent, mixed units
  varValue: number; // same, priced at cost -- the meaningful number since units don't mix
  boundaries: number; // how many closing->opening transitions contributed, this month
}

type CountLine = { product_id: string; qty_each: number | null; qty_cases: number | null };
type CountRow = { id: string; location_id: string; type: "opening" | "closing"; submitted_at: string };
type MovementRow = { product_id: string; from_location_id: string | null; to_location_id: string | null; quantity: number; created_at: string };
type ProductCost = { case_cost: number | null; case_size: number | null };

export async function computeLocationVariance(
  supabase: SupabaseClient,
  locationIds: string[],
  monthStart: Date
): Promise<Map<string, LocationVariance>> {
  const result = new Map<string, LocationVariance>();
  if (!locationIds.length) return result;

  const [{ data: countsRaw }, { data: products }] = await Promise.all([
    supabase
      .from("location_counts")
      .select("id, location_id, type, submitted_at")
      .in("location_id", locationIds)
      .in("type", ["opening", "closing"])
      .order("submitted_at", { ascending: true }),
    supabase.from("products").select("id, case_cost, case_size"),
  ]);

  const counts = (countsRaw as CountRow[] | null) ?? [];
  if (!counts.length) return result;

  const { data: linesRaw } = await supabase
    .from("location_count_lines")
    .select("location_count_id, product_id, qty_each, qty_cases")
    .in(
      "location_count_id",
      counts.map((c) => c.id)
    );
  const linesByCountId = new Map<string, Map<string, CountLine>>();
  for (const line of (linesRaw as (CountLine & { location_count_id: string })[] | null) ?? []) {
    const map = linesByCountId.get(line.location_count_id) ?? new Map<string, CountLine>();
    map.set(line.product_id, line);
    linesByCountId.set(line.location_count_id, map);
  }

  const orFilter = locationIds.map((id) => `from_location_id.eq.${id},to_location_id.eq.${id}`).join(",");
  const { data: movementsRaw } = await supabase
    .from("inventory_movements")
    .select("product_id, from_location_id, to_location_id, quantity, created_at")
    .or(orFilter);
  const movementsByProduct = new Map<string, MovementRow[]>();
  for (const m of (movementsRaw as MovementRow[] | null) ?? []) {
    const list = movementsByProduct.get(m.product_id) ?? [];
    list.push(m);
    movementsByProduct.set(m.product_id, list);
  }

  const productById = new Map(((products as (ProductCost & { id: string })[] | null) ?? []).map((p) => [p.id, p]));

  const countsByLocation = new Map<string, CountRow[]>();
  for (const c of counts) {
    const list = countsByLocation.get(c.location_id) ?? [];
    list.push(c);
    countsByLocation.set(c.location_id, list);
  }

  for (const [locationId, locationCounts] of countsByLocation) {
    let lastClosing: CountRow | null = null;
    const entry: LocationVariance = { varQty: 0, varValue: 0, boundaries: 0 };

    for (const count of locationCounts) {
      if (count.type === "closing") {
        lastClosing = count;
        continue;
      }
      // type === "opening"
      if (!lastClosing) continue;
      if (new Date(count.submitted_at) < monthStart) {
        lastClosing = null;
        continue;
      }

      const closingLines = linesByCountId.get(lastClosing.id) ?? new Map<string, CountLine>();
      const openingLines = linesByCountId.get(count.id) ?? new Map<string, CountLine>();
      const productIds = new Set([...closingLines.keys(), ...openingLines.keys()]);
      const windowStart = new Date(lastClosing.submitted_at).getTime();
      const windowEnd = new Date(count.submitted_at).getTime();

      for (const productId of productIds) {
        const product = productById.get(productId);
        if (!product) continue;

        const closingLine = closingLines.get(productId);
        const openingLine = openingLines.get(productId);
        const closingQty = closingLine ? eachEquivalent(closingLine.qty_each, closingLine.qty_cases, product.case_size) : 0;
        const openingQty = openingLine ? eachEquivalent(openingLine.qty_each, openingLine.qty_cases, product.case_size) : 0;

        let netMovement = 0;
        for (const m of movementsByProduct.get(productId) ?? []) {
          const t = new Date(m.created_at).getTime();
          if (t <= windowStart || t > windowEnd) continue;
          if (m.to_location_id === locationId) netMovement += Number(m.quantity);
          if (m.from_location_id === locationId) netMovement -= Number(m.quantity);
        }

        const expected = closingQty + netMovement;
        const variance = openingQty - expected;
        if (variance === 0) continue;

        entry.varQty += variance;
        entry.varValue += variance * unitCosts(product).perEach;
      }

      entry.boundaries += 1;
      lastClosing = null;
    }

    if (entry.boundaries > 0) result.set(locationId, entry);
  }

  return result;
}

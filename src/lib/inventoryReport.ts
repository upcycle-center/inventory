import type { SupabaseClient } from "@supabase/supabase-js";
import { getLocationCountLines, latestByProductId } from "./onHand";
import { unitCosts, lineValue, retailUnitPrices, lineRetailValue } from "./inventoryValue";

export interface InventoryReportRow {
  location: string;
  sku: string;
  description: string;
  qtyEach: number | null;
  qtyCases: number | null;
  caseCost: number;
  eachCost: number;
  costValue: number;
  salePriceEach: number;
  retailValue: number;
}

// The same location-by-location on-hand + cost calculation the dashboard's
// TOT Inventory cards use, but kept at per-product line detail instead of
// rolled up to one number per location — for the CSV/PDF export.
export async function buildInventoryReport(supabase: SupabaseClient): Promise<InventoryReportRow[]> {
  const { data: activeLocationsRaw } = await supabase.from("locations").select("id, name").eq("active", true).order("name");
  const locations = (activeLocationsRaw as { id: string; name: string }[] | null) ?? [];
  if (!locations.length) return [];

  const locationIds = locations.map((l) => l.id);
  const { data: locationProductsRaw } = await supabase
    .from("location_products")
    .select("location_id, product_id, product:products(id, sku, description, case_cost, sale_price, case_size)")
    .in("location_id", locationIds)
    .eq("active", true);

  const productsByLocationId = new Map<string, Map<string, any>>();
  for (const row of (locationProductsRaw as any[]) ?? []) {
    if (!row.product) continue;
    const map = productsByLocationId.get(row.location_id) ?? new Map();
    map.set(row.product_id, row.product);
    productsByLocationId.set(row.location_id, map);
  }

  const rows: InventoryReportRow[] = [];
  for (const loc of locations) {
    const lines = await getLocationCountLines(supabase, loc.id);
    const onHand = latestByProductId(lines);
    const products = productsByLocationId.get(loc.id);
    if (!products) continue;

    for (const [productId, entry] of onHand) {
      const product = products.get(productId);
      if (!product) continue;
      const { perEach: eachCost, perCase: caseCost } = unitCosts(product);
      const { perEach: salePriceEach } = retailUnitPrices(product);
      rows.push({
        location: loc.name,
        sku: product.sku,
        description: product.description,
        qtyEach: entry.qty_each,
        qtyCases: entry.qty_cases,
        caseCost,
        eachCost,
        costValue: lineValue(entry.qty_each, entry.qty_cases, product),
        salePriceEach,
        retailValue: lineRetailValue(entry.qty_each, entry.qty_cases, product),
      });
    }
  }
  return rows;
}

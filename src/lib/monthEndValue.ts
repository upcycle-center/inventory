import type { SupabaseClient } from "@supabase/supabase-js";
import { sortStorageAreas } from "./storageAreas";

export interface MonthEndValueLine {
  productId: string;
  sku: string;
  description: string;
  qtyEach: number | null;
  qtyCases: number | null;
  value: number;
}

export interface MonthEndValueStorageAreaGroup {
  id: string;
  code: string;
  name: string;
  lines: MonthEndValueLine[];
  subtotal: number;
}

export interface MonthEndValueLocationGroup {
  id: string;
  name: string;
  yellow_dog_code: string | null;
  type: string;
  areas: MonthEndValueStorageAreaGroup[];
  total: number;
}

// Posted month-end physical counts don't carry a storage area of their
// own -- it's only ever known per (location, product) via location_products
// -- so a product no longer assigned there falls in here instead of being
// dropped from the report.
const UNASSIGNED_AREA = { id: "unassigned", code: "OTH", name: "Unassigned" };

// Shared by the moEND TOT Inventory Value and moEND TOT Retail Value
// reports -- same Location -> Storage Area -> product-line grouping over
// location_product_month_end, just a different valuator (cost vs. retail)
// applied to each posted line.
export async function buildMonthEndValueReport(
  supabase: SupabaseClient,
  year: number,
  month: number,
  valuator: (qtyEach: number | null | undefined, qtyCases: number | null | undefined, product: any) => number
): Promise<{ locations: MonthEndValueLocationGroup[]; grandTotal: number }> {
  const { data: locationsRaw } = await supabase
    .from("locations")
    .select("id, name, type, yellow_dog_code")
    .eq("active", true)
    .order("name");
  const locations = (locationsRaw as { id: string; name: string; type: string; yellow_dog_code: string | null }[] | null) ?? [];
  if (!locations.length) return { locations: [], grandTotal: 0 };

  const locationIds = locations.map((l) => l.id);

  const [{ data: monthEndRowsRaw }, { data: locationProductsRaw }] = await Promise.all([
    supabase
      .from("location_product_month_end")
      .select(
        "location_id, product_id, physical_qty_each, physical_qty_cases, product:products(id, sku, description, product_type, case_cost, sale_price, case_size, bottle_size_ml, pour_size_oz, pour_price)"
      )
      .in("location_id", locationIds)
      .eq("year", year)
      .eq("month", month),
    supabase
      .from("location_products")
      .select("location_id, product_id, storage_area:storage_areas(id, code, name)")
      .in("location_id", locationIds)
      .eq("active", true),
  ]);

  const storageAreaByKey = new Map<string, { id: string; code: string; name: string }>();
  for (const row of (locationProductsRaw as any[]) ?? []) {
    if (!row.storage_area) continue;
    storageAreaByKey.set(`${row.location_id}:${row.product_id}`, row.storage_area);
  }

  const areasByLocationId = new Map<string, Map<string, MonthEndValueStorageAreaGroup>>();
  let grandTotal = 0;

  for (const row of (monthEndRowsRaw as any[]) ?? []) {
    if (!row.product) continue;
    const value = valuator(row.physical_qty_each, row.physical_qty_cases, row.product);
    const area = storageAreaByKey.get(`${row.location_id}:${row.product_id}`) ?? UNASSIGNED_AREA;

    const areaMap = areasByLocationId.get(row.location_id) ?? new Map<string, MonthEndValueStorageAreaGroup>();
    const group = areaMap.get(area.id) ?? { ...area, lines: [], subtotal: 0 };
    group.lines.push({
      productId: row.product_id,
      sku: row.product.sku,
      description: row.product.description,
      qtyEach: row.physical_qty_each,
      qtyCases: row.physical_qty_cases,
      value,
    });
    group.subtotal += value;
    areaMap.set(area.id, group);
    areasByLocationId.set(row.location_id, areaMap);
    grandTotal += value;
  }

  const locationGroups: MonthEndValueLocationGroup[] = [];
  for (const loc of locations) {
    const areaMap = areasByLocationId.get(loc.id);
    if (!areaMap || !areaMap.size) continue;
    const areas = sortStorageAreas(Array.from(areaMap.values()));
    const total = areas.reduce((sum, a) => sum + a.subtotal, 0);
    locationGroups.push({ id: loc.id, name: loc.name, yellow_dog_code: loc.yellow_dog_code, type: loc.type, areas, total });
  }

  return { locations: locationGroups, grandTotal };
}

// Same Warehouse/Liquor Room/Kitchen/Stands rollup heuristic the Dashboard's
// TOT Inventory and TOT Retail cards use.
export function bucketLocationGroups(locations: MonthEndValueLocationGroup[]) {
  let warehouse = 0;
  let liquorRoom = 0;
  let kitchen = 0;
  let stands = 0;
  for (const loc of locations) {
    if (loc.type === "stand") {
      stands += loc.total;
    } else if (loc.type === "warehouse") {
      if (/liquor|alcohol/i.test(loc.name)) liquorRoom += loc.total;
      else warehouse += loc.total;
    } else if (loc.type === "kitchen") {
      kitchen += loc.total;
    }
  }
  return { warehouse, liquorRoom, kitchen, stands };
}

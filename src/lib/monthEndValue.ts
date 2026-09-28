import type { SupabaseClient } from "@supabase/supabase-js";

export type MonthEndGroupBy = "location" | "storage_area" | "category" | "vendor" | "product";

export interface MonthEndValueLine {
  productId: string;
  sku: string;
  description: string;
  qtyEach: number | null;
  qtyCases: number | null;
  qtyMiddleUnit: number | null;
  middleUnitLabel: string | null;
  value: number;
  locationId: string;
  locationName: string;
  locationType: string;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  storageAreaId: string;
  storageAreaName: string;
}

export interface MonthEndValueFilters {
  locationId?: string;
  categoryId?: string;
  supplierId?: string;
  storageAreaId?: string;
}

export interface MonthEndValueSubgroup {
  id: string;
  name: string;
  lines: MonthEndValueLine[];
  subtotal: number;
}

export interface MonthEndValueGroup {
  id: string;
  name: string;
  subgroups: MonthEndValueSubgroup[];
  subtotal: number;
}

// Posted month-end physical counts don't carry a category/vendor/storage
// area of their own -- those all come from the product (or, for storage
// area, from location_products) -- so a product missing one falls into a
// named catch-all instead of being dropped from the report.
const UNASSIGNED_LOCATION_AREA = { id: "unassigned", name: "Unassigned" };
const UNCATEGORIZED = { id: "uncategorized", name: "Uncategorized" };
const NO_VENDOR = { id: "no_vendor", name: "No Vendor" };
const CATCH_ALL_IDS = new Set([UNASSIGNED_LOCATION_AREA.id, UNCATEGORIZED.id, NO_VENDOR.id]);

function sortAlphaCatchAllLast<T extends { id: string; name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aCatch = CATCH_ALL_IDS.has(a.id);
    const bCatch = CATCH_ALL_IDS.has(b.id);
    if (aCatch && !bCatch) return 1;
    if (bCatch && !aCatch) return -1;
    return a.name.localeCompare(b.name);
  });
}

// Every posted month-end line for a month, flattened with every
// filter/group dimension (Location, Category, Vendor, Storage Area)
// already attached to it -- filtering and grouping are then pure
// functions over this one list, shared by the TOT Inventory Value and
// TOT Retail Value reports (just a different valuator per $ line).
export async function buildMonthEndValueLines(
  supabase: SupabaseClient,
  year: number,
  month: number,
  valuator: (
    qtyEach: number | null | undefined,
    qtyCases: number | null | undefined,
    product: any,
    qtyMiddle?: number | null
  ) => number
): Promise<MonthEndValueLine[]> {
  const { data: locationsRaw } = await supabase
    .from("locations")
    .select("id, name, type, yellow_dog_code")
    .eq("active", true);
  const locations = (locationsRaw as { id: string; name: string; type: string }[] | null) ?? [];
  if (!locations.length) return [];
  const locationIds = locations.map((l) => l.id);
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const [{ data: monthEndRowsRaw }, { data: locationProductsRaw }, { data: categoriesRaw }, { data: suppliersRaw }] = await Promise.all([
    supabase
      .from("location_product_month_end")
      .select(
        "location_id, product_id, physical_qty_each, physical_qty_cases, physical_qty_middle_unit, product:products(id, sku, description, product_type, case_cost, sale_price, case_size, bottle_size_ml, pour_size_oz, pour_price, middle_unit_label, middle_unit_size, category_id, supplier_id)"
      )
      .in("location_id", locationIds)
      .eq("year", year)
      .eq("month", month),
    supabase
      .from("location_products")
      .select("location_id, product_id, storage_area:storage_areas(id, name)")
      .in("location_id", locationIds)
      .eq("active", true),
    supabase.from("product_categories").select("id, name"),
    supabase.from("suppliers").select("id, name"),
  ]);

  const categoryNameById = new Map(((categoriesRaw as { id: string; name: string }[] | null) ?? []).map((c) => [c.id, c.name]));
  const supplierNameById = new Map(((suppliersRaw as { id: string; name: string }[] | null) ?? []).map((s) => [s.id, s.name]));
  const storageAreaByKey = new Map<string, { id: string; name: string }>();
  for (const row of (locationProductsRaw as any[]) ?? []) {
    if (!row.storage_area) continue;
    storageAreaByKey.set(`${row.location_id}:${row.product_id}`, row.storage_area);
  }

  const lines: MonthEndValueLine[] = [];
  for (const row of (monthEndRowsRaw as any[]) ?? []) {
    if (!row.product) continue;
    const location = locationById.get(row.location_id);
    if (!location) continue;
    const value = valuator(row.physical_qty_each, row.physical_qty_cases, row.product, row.physical_qty_middle_unit);
    const area = storageAreaByKey.get(`${row.location_id}:${row.product_id}`) ?? UNASSIGNED_LOCATION_AREA;

    lines.push({
      productId: row.product_id,
      sku: row.product.sku,
      description: row.product.description,
      qtyEach: row.physical_qty_each,
      qtyCases: row.physical_qty_cases,
      qtyMiddleUnit: row.physical_qty_middle_unit,
      middleUnitLabel: row.product.middle_unit_label,
      value,
      locationId: location.id,
      locationName: location.name,
      locationType: location.type,
      categoryId: row.product.category_id ?? UNCATEGORIZED.id,
      categoryName: row.product.category_id ? categoryNameById.get(row.product.category_id) ?? UNCATEGORIZED.name : UNCATEGORIZED.name,
      supplierId: row.product.supplier_id ?? NO_VENDOR.id,
      supplierName: row.product.supplier_id ? supplierNameById.get(row.product.supplier_id) ?? NO_VENDOR.name : NO_VENDOR.name,
      storageAreaId: area.id,
      storageAreaName: area.name,
    });
  }
  return lines;
}

export function filterMonthEndValueLines(lines: MonthEndValueLine[], filters: MonthEndValueFilters): MonthEndValueLine[] {
  return lines.filter(
    (l) =>
      (!filters.locationId || l.locationId === filters.locationId) &&
      (!filters.categoryId || l.categoryId === filters.categoryId) &&
      (!filters.supplierId || l.supplierId === filters.supplierId) &&
      (!filters.storageAreaId || l.storageAreaId === filters.storageAreaId)
  );
}

function pickDimension(line: MonthEndValueLine, dim: MonthEndGroupBy): { id: string; name: string } {
  switch (dim) {
    case "location":
      return { id: line.locationId, name: line.locationName };
    case "storage_area":
      return { id: line.storageAreaId, name: line.storageAreaName };
    case "category":
      return { id: line.categoryId, name: line.categoryName };
    case "vendor":
      return { id: line.supplierId, name: line.supplierName };
    case "product":
      return { id: line.productId, name: line.description };
  }
}

// Primary dimension = groupBy; secondary = Location, except grouping BY
// Location instead drills into Storage Area (the physical layout staff
// already walk), and grouping by Product is already the finest grain --
// no secondary level, just one subgroup per product.
export function groupMonthEndValueLines(
  lines: MonthEndValueLine[],
  groupBy: MonthEndGroupBy
): { groups: MonthEndValueGroup[]; grandTotal: number } {
  const secondaryDim: MonthEndGroupBy = groupBy === "product" ? "product" : groupBy === "location" ? "storage_area" : "location";

  const groupMap = new Map<string, { name: string; subgroupMap: Map<string, MonthEndValueSubgroup> }>();
  let grandTotal = 0;

  for (const line of lines) {
    const primary = pickDimension(line, groupBy);
    const secondary = pickDimension(line, secondaryDim);
    const group = groupMap.get(primary.id) ?? { name: primary.name, subgroupMap: new Map<string, MonthEndValueSubgroup>() };
    const subgroup = group.subgroupMap.get(secondary.id) ?? { id: secondary.id, name: secondary.name, lines: [], subtotal: 0 };
    subgroup.lines.push(line);
    subgroup.subtotal += line.value;
    group.subgroupMap.set(secondary.id, subgroup);
    groupMap.set(primary.id, group);
    grandTotal += line.value;
  }

  const groups: MonthEndValueGroup[] = Array.from(groupMap.entries()).map(([id, g]) => {
    const subgroups = sortAlphaCatchAllLast(Array.from(g.subgroupMap.values())).map((sg) => ({
      ...sg,
      lines: sg.lines.slice().sort((a, b) => a.description.localeCompare(b.description)),
    }));
    const subtotal = subgroups.reduce((sum, sg) => sum + sg.subtotal, 0);
    return { id, name: g.name, subgroups, subtotal };
  });

  return { groups: sortAlphaCatchAllLast(groups), grandTotal };
}

// Same Warehouse/Liquor Room/Kitchen/Stands rollup the Dashboard's TOT
// Inventory and TOT Retail cards use -- independent of whatever grouping
// is on screen, always bucketed straight off the (filtered) lines.
export function bucketLocationTypes(lines: MonthEndValueLine[]) {
  let warehouse = 0;
  let liquorRoom = 0;
  let kitchen = 0;
  let stands = 0;
  for (const l of lines) {
    if (l.locationType === "stand") {
      stands += l.value;
    } else if (l.locationType === "warehouse") {
      if (/liquor|alcohol/i.test(l.locationName)) liquorRoom += l.value;
      else warehouse += l.value;
    } else if (l.locationType === "kitchen") {
      kitchen += l.value;
    }
  }
  return { warehouse, liquorRoom, kitchen, stands };
}

export function locationTotals(lines: MonthEndValueLine[]): { id: string; name: string; total: number }[] {
  const totalById = new Map<string, { id: string; name: string; total: number }>();
  for (const l of lines) {
    const entry = totalById.get(l.locationId) ?? { id: l.locationId, name: l.locationName, total: 0 };
    entry.total += l.value;
    totalById.set(l.locationId, entry);
  }
  return Array.from(totalById.values()).sort((a, b) => b.total - a.total);
}

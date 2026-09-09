import type { SupabaseClient } from "@supabase/supabase-js";
import { sortStorageAreas } from "./storageAreas";

export interface WasteCompLine {
  productId: string;
  sku: string;
  description: string;
  waste: number;
  comp: number;
}

export interface WasteCompAreaGroup {
  id: string;
  code: string;
  name: string;
  lines: WasteCompLine[];
  wasteSubtotal: number;
  compSubtotal: number;
}

export interface WasteCompLocationGroup {
  id: string;
  name: string;
  yellow_dog_code: string | null;
  type: string;
  areas: WasteCompAreaGroup[];
  wasteTotal: number;
  compTotal: number;
}

// Waste/comp records don't have a year/month of their own -- they're tied
// to the event or the moment they were logged -- so this reuses the
// existing event-scoped waste_records/comp_records tables filtered to the
// report's calendar month, same approximation the Dashboard already makes
// for "this month's" waste & comps.
const UNASSIGNED_AREA = { id: "unassigned", code: "OTH", name: "Unassigned" };

export async function buildMonthEndWasteCompsReport(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<{ locations: WasteCompLocationGroup[]; wasteTotal: number; compTotal: number }> {
  const { data: locationsRaw } = await supabase
    .from("locations")
    .select("id, name, type, yellow_dog_code")
    .eq("active", true)
    .order("name");
  const locations = (locationsRaw as { id: string; name: string; type: string; yellow_dog_code: string | null }[] | null) ?? [];
  if (!locations.length) return { locations: [], wasteTotal: 0, compTotal: 0 };

  const locationIds = locations.map((l) => l.id);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const [{ data: wasteRowsRaw }, { data: compRowsRaw }, { data: locationProductsRaw }] = await Promise.all([
    supabase
      .from("waste_records")
      .select("location_id, product_id, quantity, product:products(id, sku, description)")
      .in("location_id", locationIds)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
    supabase
      .from("comp_records")
      .select("location_id, product_id, quantity, product:products(id, sku, description)")
      .in("location_id", locationIds)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
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

  const areasByLocationId = new Map<string, Map<string, WasteCompAreaGroup>>();
  let wasteTotal = 0;
  let compTotal = 0;

  function addRow(row: any, field: "waste" | "comp") {
    if (!row.product) return;
    const qty = Number(row.quantity);
    const area = storageAreaByKey.get(`${row.location_id}:${row.product_id}`) ?? UNASSIGNED_AREA;
    const areaMap = areasByLocationId.get(row.location_id) ?? new Map<string, WasteCompAreaGroup>();
    const group = areaMap.get(area.id) ?? { ...area, lines: [] as WasteCompLine[], wasteSubtotal: 0, compSubtotal: 0 };
    let line = group.lines.find((l) => l.productId === row.product_id);
    if (!line) {
      line = { productId: row.product_id, sku: row.product.sku, description: row.product.description, waste: 0, comp: 0 };
      group.lines.push(line);
    }
    line[field] += qty;
    if (field === "waste") group.wasteSubtotal += qty;
    else group.compSubtotal += qty;
    areaMap.set(area.id, group);
    areasByLocationId.set(row.location_id, areaMap);
  }

  for (const row of (wasteRowsRaw as any[]) ?? []) {
    wasteTotal += Number(row.quantity);
    addRow(row, "waste");
  }
  for (const row of (compRowsRaw as any[]) ?? []) {
    compTotal += Number(row.quantity);
    addRow(row, "comp");
  }

  const locationGroups: WasteCompLocationGroup[] = [];
  for (const loc of locations) {
    const areaMap = areasByLocationId.get(loc.id);
    if (!areaMap || !areaMap.size) continue;
    const areas = sortStorageAreas(Array.from(areaMap.values()));
    const wasteTotalLoc = areas.reduce((sum, a) => sum + a.wasteSubtotal, 0);
    const compTotalLoc = areas.reduce((sum, a) => sum + a.compSubtotal, 0);
    locationGroups.push({
      id: loc.id,
      name: loc.name,
      yellow_dog_code: loc.yellow_dog_code,
      type: loc.type,
      areas,
      wasteTotal: wasteTotalLoc,
      compTotal: compTotalLoc,
    });
  }

  return { locations: locationGroups, wasteTotal, compTotal };
}

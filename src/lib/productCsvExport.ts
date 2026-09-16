import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the full Products export and the Square POS data-map export --
// same column layout bulkUploadProducts expects, either every active
// product or (posSquareOnly) just the ones flagged for that data map.
export async function buildProductExportRows(
  supabase: SupabaseClient,
  options: { posSquareOnly?: boolean } = {}
): Promise<(string | number)[][]> {
  let productsQuery = supabase.from("products").select("*").order("description");
  if (options.posSquareOnly) productsQuery = productsQuery.eq("pos_square", true);

  const [{ data: products }, { data: categories }, { data: suppliers }, { data: locations }, { data: storageAreas }, { data: locationProducts }, { data: thresholds }] =
    await Promise.all([
      productsQuery,
      supabase.from("product_categories").select("id, name"),
      supabase.from("suppliers").select("id, name"),
      supabase.from("locations").select("id, name, yellow_dog_code"),
      supabase.from("storage_areas").select("id, code"),
      supabase.from("location_products").select("product_id, location_id, storage_area_id"),
      supabase.from("inventory_thresholds").select("product_id, location_id, reorder_threshold"),
    ]);

  const categoryNameById = new Map(((categories as { id: string; name: string }[] | null) ?? []).map((c) => [c.id, c.name]));
  const supplierNameById = new Map(((suppliers as { id: string; name: string }[] | null) ?? []).map((s) => [s.id, s.name]));
  const locationById = new Map(
    ((locations as { id: string; name: string; yellow_dog_code: string | null }[] | null) ?? []).map((l) => [l.id, l])
  );
  const storageAreaCodeById = new Map(((storageAreas as { id: string; code: string }[] | null) ?? []).map((a) => [a.id, a.code]));
  const thresholdByKey = new Map(
    ((thresholds as { product_id: string; location_id: string; reorder_threshold: number }[] | null) ?? []).map((t) => [
      `${t.product_id}:${t.location_id}`,
      t.reorder_threshold,
    ])
  );

  const locationRowsByProductId = new Map<string, { location_id: string; storage_area_id: string }[]>();
  for (const lp of (locationProducts as { product_id: string; location_id: string; storage_area_id: string }[] | null) ?? []) {
    const list = locationRowsByProductId.get(lp.product_id) ?? [];
    list.push(lp);
    locationRowsByProductId.set(lp.product_id, list);
  }

  const header = [
    "sku",
    "description",
    "product_type",
    "category",
    "supplier",
    "upc",
    "case_cost",
    "sale_price",
    "unit_of_measure",
    "case_size",
    "bottle_size_ml",
    "pour_size_oz",
    "pour_price",
    "middle_unit_label",
    "middle_unit_size",
    "each_countable",
    "pos_square",
    "location",
    "storage_area",
    "reorder_threshold",
  ];
  const rows: (string | number)[][] = [header];

  for (const p of (products as any[]) ?? []) {
    const baseRow = [
      p.sku,
      p.description,
      p.product_type,
      p.category_id ? categoryNameById.get(p.category_id) ?? "" : "",
      p.supplier_id ? supplierNameById.get(p.supplier_id) ?? "" : "",
      p.upc ?? "",
      p.case_cost ?? "",
      p.sale_price ?? "",
      p.unit_of_measure,
      p.case_size ?? "",
      p.bottle_size_ml ?? "",
      p.pour_size_oz ?? "",
      p.pour_price ?? "",
      p.middle_unit_label ?? "",
      p.middle_unit_size ?? "",
      p.each_countable ? "yes" : "no",
      p.pos_square ? "yes" : "no",
    ];

    const locationRows = locationRowsByProductId.get(p.id) ?? [];
    if (!locationRows.length) {
      rows.push([...baseRow, "", "", ""]);
      continue;
    }
    for (const lp of locationRows) {
      const location = locationById.get(lp.location_id);
      const locationKey = location?.yellow_dog_code || location?.name || "";
      const storageAreaCode = storageAreaCodeById.get(lp.storage_area_id) ?? "";
      const threshold = thresholdByKey.get(`${p.id}:${lp.location_id}`);
      rows.push([...baseRow, locationKey, storageAreaCode, threshold ?? ""]);
    }
  }

  return rows;
}

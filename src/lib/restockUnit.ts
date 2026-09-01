import type { SupabaseClient } from "@supabase/supabase-js";

export type RestockUnit = "case" | "each";

// Whichever warehouse actually stocks a product determines what unit a
// restock request should be pulled in: the Liquor/Alcohol warehouse issues
// individual bottles/cans (each), the general warehouse issues full cases.
// A product stocked at an alcohol warehouse always resolves to "each",
// even if it's also stocked elsewhere.
export async function getRestockUnitByProductId(supabase: SupabaseClient): Promise<Map<string, RestockUnit>> {
  const { data: warehouses } = await supabase.from("locations").select("id, name").eq("type", "warehouse");
  const warehouseList = (warehouses as { id: string; name: string }[] | null) ?? [];
  if (!warehouseList.length) return new Map();

  const { data: rows } = await supabase
    .from("location_products")
    .select("product_id, location_id")
    .in(
      "location_id",
      warehouseList.map((w) => w.id)
    );

  const alcoholWarehouseIds = new Set(warehouseList.filter((w) => /liquor|alcohol/i.test(w.name)).map((w) => w.id));

  const unitByProductId = new Map<string, RestockUnit>();
  for (const row of (rows as { product_id: string; location_id: string }[] | null) ?? []) {
    if (alcoholWarehouseIds.has(row.location_id)) {
      unitByProductId.set(row.product_id, "each");
    } else if (unitByProductId.get(row.product_id) !== "each") {
      unitByProductId.set(row.product_id, "case");
    }
  }
  return unitByProductId;
}

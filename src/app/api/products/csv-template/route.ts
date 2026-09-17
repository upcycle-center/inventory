import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { logCsvEvent } from "@/lib/productCsvEvents";
import { isProductTypeValue, type ProductTypeValue } from "@/lib/productType";

// Columns every product type needs, regardless of how it's valued.
const BASE_COLUMNS = [
  "sku",
  "description",
  "brand",
  "photo_url",
  "product_type",
  "active",
  "category",
  "gl_code",
  "supplier",
  "upc",
  "case_cost",
] as const;

// Only Chargeable is sold as a whole unit (sale_price); only Non-Chargeable
// – Bottles is poured (bottle/pour sizing + price per pour). Mixers and
// Disposables carry neither -- they're never billed on their own -- so
// their template skips both groups of columns entirely.
const TYPE_COLUMNS: Record<ProductTypeValue, readonly string[]> = {
  chargeable: ["sale_price"],
  non_chargeable_bottle: ["bottle_size_ml", "pour_size_oz", "pour_price"],
  non_chargeable_mixer: [],
  disposable: [],
};

const TAIL_COLUMNS = [
  "unit_of_measure",
  "case_size",
  "middle_unit_label",
  "middle_unit_size",
  "each_countable",
  "pos_square",
  "location",
  "storage_area",
  "reorder_threshold",
] as const;

type ExampleRow = Record<string, string>;

// One (or two, to show the one-row-per-location convention) realistic
// example row per type, using only the columns that type's template has.
function exampleRows(type: ProductTypeValue, exampleCategoryName: string, exampleGlCode: string): ExampleRow[] {
  switch (type) {
    case "chargeable":
      return [
        {
          sku: "EX-001",
          description: "Example Product",
          product_type: "chargeable",
          active: "yes",
          upc: "012345678905",
          case_cost: "24.00",
          sale_price: "6.00",
          unit_of_measure: "each",
          case_size: "24",
          each_countable: "yes",
          pos_square: "yes",
          location: "023",
          storage_area: "LC",
          reorder_threshold: "12",
        },
        {
          sku: "EX-001",
          description: "Example Product",
          product_type: "chargeable",
          active: "yes",
          upc: "012345678905",
          case_cost: "24.00",
          sale_price: "6.00",
          unit_of_measure: "each",
          case_size: "24",
          each_countable: "yes",
          pos_square: "yes",
          location: "VIP In Seat",
          storage_area: "WF",
          reorder_threshold: "6",
        },
      ];
    case "non_chargeable_bottle":
      return [
        {
          sku: "EX-003",
          description: "Well Vodka 750ml",
          product_type: "non_chargeable_bottle",
          active: "yes",
          category: exampleCategoryName,
          gl_code: exampleGlCode,
          case_cost: "18.00",
          unit_of_measure: "each",
          case_size: "1",
          bottle_size_ml: "750",
          pour_size_oz: "1.5",
          pour_price: "9.00",
          each_countable: "yes",
          pos_square: "no",
          location: "023",
          storage_area: "LC",
          reorder_threshold: "6",
        },
      ];
    case "non_chargeable_mixer":
      return [
        {
          sku: "EX-005",
          description: "Sour Mix",
          product_type: "non_chargeable_mixer",
          active: "yes",
          case_cost: "12.00",
          unit_of_measure: "each",
          case_size: "4",
          each_countable: "yes",
          pos_square: "no",
          location: "023",
          storage_area: "LC",
          reorder_threshold: "2",
        },
      ];
    case "disposable":
      return [
        {
          sku: "EX-004",
          description: "Dinner Napkins",
          product_type: "disposable",
          active: "yes",
          case_cost: "22.00",
          unit_of_measure: "each",
          case_size: "12",
          middle_unit_label: "Count",
          middle_unit_size: "500",
          each_countable: "no",
          pos_square: "no",
          location: "023",
          storage_area: "OTH",
          reorder_threshold: "2000",
        },
      ];
  }
}

// A starter file for the bulk upload form, scoped to one product type at a
// time (?type=chargeable|non_chargeable_bottle|non_chargeable_mixer|disposable)
// so creating, say, a mixer doesn't require staring at empty sale_price/pour
// columns that type will never use.
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") ?? "chargeable";
  const productType: ProductTypeValue = isProductTypeValue(typeParam) ? typeParam : "chargeable";

  const supabase = createClient();
  await logCsvEvent(supabase, {
    direction: "download",
    kind: "template",
    filename: `${productType}-products-template.csv`,
    performedBy: profile.id,
  });

  // The example rows show a real category (and its real GL Code) instead
  // of a made-up placeholder -- copying "Liquor" into the category column
  // when the actual category is named "Concession Liquor" is exactly the
  // kind of mismatch that silently fails to match on upload.
  const { data: categoriesRaw } = await supabase.from("product_categories").select("name, gl_code").order("name");
  const categories = (categoriesRaw as { name: string; gl_code: string | null }[] | null) ?? [];
  const pourExampleCategory = categories.find((c) => /liquor|wine/i.test(c.name)) ?? categories[0] ?? null;
  const exampleCategoryName = pourExampleCategory?.name ?? "";
  const exampleGlCode = pourExampleCategory?.gl_code ?? "";

  const header = [...BASE_COLUMNS, ...TYPE_COLUMNS[productType], ...TAIL_COLUMNS];
  const rows = exampleRows(productType, exampleCategoryName, exampleGlCode).map((row) => header.map((col) => row[col] ?? ""));
  const csv = toCsv([header, ...rows]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${productType}-products-template.csv"`,
    },
  });
}

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { logCsvEvent } from "@/lib/productCsvEvents";

// A starter file for the bulk upload form -- headers plus one example row
// showing the one-row-per-location convention (two rows, same SKU, two
// different locations).
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  await logCsvEvent(supabase, { direction: "download", kind: "template", performedBy: profile.id });

  // The example rows show a real category (and its real GL Code) instead
  // of a made-up placeholder -- copying "Liquor" into the category column
  // when the actual category is named "Concession Liquor" is exactly the
  // kind of mismatch that silently fails to match on upload.
  const { data: categoriesRaw } = await supabase.from("product_categories").select("name, gl_code").order("name");
  const categories = (categoriesRaw as { name: string; gl_code: string | null }[] | null) ?? [];
  const pourExampleCategory = categories.find((c) => /liquor|wine/i.test(c.name)) ?? categories[0] ?? null;
  const exampleCategoryName = pourExampleCategory?.name ?? "";
  const exampleGlCode = pourExampleCategory?.gl_code ?? "";

  const csv = toCsv([
    [
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
    ],
    ["EX-001", "Example Product", "", "", "chargeable", "yes", "", "", "", "012345678905", "24.00", "6.00", "each", "24", "", "", "", "", "", "yes", "yes", "023", "LC", "12"],
    ["EX-001", "Example Product", "", "", "chargeable", "yes", "", "", "", "012345678905", "24.00", "6.00", "each", "24", "", "", "", "", "", "yes", "yes", "VIP In Seat", "WF", "6"],
    ["EX-002", "16oz Plastic Cup", "", "", "disposable", "yes", "", "", "", "", "18.00", "", "each", "10", "", "", "", "Count", "50", "yes", "no", "023", "OTH", "1000"],
    ["EX-003", "Well Vodka 750ml", "", "", "non_chargeable_bottle", "yes", exampleCategoryName, exampleGlCode, "", "", "18.00", "", "each", "1", "750", "1.5", "9.00", "", "", "yes", "no", "023", "LC", "6"],
    ["EX-004", "Dinner Napkins", "", "", "disposable", "yes", "", "", "", "", "22.00", "", "each", "12", "", "", "", "Count", "500", "no", "no", "023", "OTH", "2000"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-bulk-upload-template.csv"`,
    },
  });
}

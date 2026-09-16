import { getCurrentProfile } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

// A starter file for the bulk upload form -- headers plus one example row
// showing the one-row-per-location convention (two rows, same SKU, two
// different locations).
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const csv = toCsv([
    [
      "sku",
      "description",
      "brand",
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
    ],
    ["EX-001", "Example Product", "", "chargeable", "", "", "012345678905", "24.00", "6.00", "each", "24", "", "", "", "", "", "yes", "yes", "023", "LC", "12"],
    ["EX-001", "Example Product", "", "chargeable", "", "", "012345678905", "24.00", "6.00", "each", "24", "", "", "", "", "", "yes", "yes", "VIP In Seat", "WF", "6"],
    ["EX-002", "16oz Plastic Cup", "", "disposable", "", "", "", "18.00", "", "each", "10", "", "", "", "Count", "50", "yes", "no", "023", "OTH", "1000"],
    ["EX-003", "Well Vodka 750ml", "", "non_chargeable_bottle", "Liquor", "", "", "18.00", "", "each", "1", "750", "1.5", "9.00", "", "", "yes", "no", "023", "LC", "6"],
    ["EX-004", "Dinner Napkins", "", "disposable", "", "", "", "22.00", "", "each", "12", "", "", "", "Count", "500", "no", "no", "023", "OTH", "2000"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-bulk-upload-template.csv"`,
    },
  });
}

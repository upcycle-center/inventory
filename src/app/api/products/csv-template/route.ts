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
      "location",
      "storage_area",
      "reorder_threshold",
    ],
    ["EX-001", "Example Product", "chargeable", "", "", "012345678905", "24.00", "6.00", "each", "24", "", "", "", "023", "LC", "12"],
    ["EX-001", "Example Product", "chargeable", "", "", "012345678905", "24.00", "6.00", "each", "24", "", "", "", "VIP In Seat", "WF", "6"],
    ["EX-002", "16oz Plastic Cup", "disposable", "", "", "", "18.00", "", "each", "500", "", "", "", "023", "OTH", "1000"],
    ["EX-003", "Well Vodka 750ml", "non_chargeable_bottle", "Liquor", "", "", "18.00", "", "each", "1", "750", "1.5", "9.00", "023", "LC", "6"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-bulk-upload-template.csv"`,
    },
  });
}

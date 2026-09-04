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
      "upc",
      "case_cost",
      "sale_price",
      "unit_of_measure",
      "case_size",
      "location",
      "storage_area",
      "reorder_threshold",
    ],
    ["EX-001", "Example Product", "sellable", "012345678905", "24.00", "6.00", "each", "24", "023", "LC", "12"],
    ["EX-001", "Example Product", "sellable", "012345678905", "24.00", "6.00", "each", "24", "VIP In Seat", "WF", "6"],
    ["EX-002", "16oz Plastic Cup", "consumable", "", "18.00", "", "each", "500", "023", "OTH", "1000"],
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-bulk-upload-template.csv"`,
    },
  });
}

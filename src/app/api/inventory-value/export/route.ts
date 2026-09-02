import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildInventoryReport } from "@/lib/inventoryReport";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const rows = await buildInventoryReport(supabase);

  const csv = toCsv([
    ["Location", "IC", "Product", "On-Hand EA", "On-Hand CS", "Case Cost", "Each Cost", "Cost Value", "Sale Price (Each)", "Retail Value"],
    ...rows.map((r) => [
      r.location,
      r.sku,
      r.description,
      r.qtyEach ?? "",
      r.qtyCases ?? "",
      r.caseCost.toFixed(2),
      r.eachCost.toFixed(2),
      r.costValue.toFixed(2),
      r.salePriceEach.toFixed(2),
      r.retailValue.toFixed(2),
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-value-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

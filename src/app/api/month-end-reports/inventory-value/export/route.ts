import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/exportFilename";
import { buildMonthEndValueLines, filterMonthEndValueLines } from "@/lib/monthEndValue";
import { parseMonthEndReportParams } from "@/lib/monthEndReportParams";
import { lineValue } from "@/lib/inventoryValue";

// A flat CSV of exactly what's on screen -- same filters, no grouping --
// so the person exploring the report on screen has a one-click path to a
// spreadsheet once they've narrowed it down to what they actually want.
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const params = parseMonthEndReportParams(Object.fromEntries(searchParams));
  const supabase = createClient();

  const allLines = await buildMonthEndValueLines(supabase, params.year, params.month, lineValue);
  const lines = filterMonthEndValueLines(allLines, params.filters).sort(
    (a, b) => a.locationName.localeCompare(b.locationName) || a.description.localeCompare(b.description)
  );

  const csv = toCsv([
    ["Location", "Storage Area", "Category", "Vendor", "SKU", "Product", "Qty (each)", "Qty (cases)", "Qty (middle unit)", "Value"],
    ...lines.map((l) => [
      l.locationName,
      l.storageAreaName,
      l.categoryName,
      l.supplierName,
      l.sku,
      l.description,
      l.qtyEach ?? "",
      l.qtyCases ?? "",
      l.qtyMiddleUnit ? `${l.qtyMiddleUnit} ${l.middleUnitLabel ?? ""}`.trim() : "",
      l.value.toFixed(2),
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename("moEND-Inventory-Value", "csv")}"`,
    },
  });
}

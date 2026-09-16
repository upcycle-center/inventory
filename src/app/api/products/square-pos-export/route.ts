import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/exportFilename";
import { buildProductExportRows } from "@/lib/productCsvExport";

// The Square data map -- only products with the "POS Square" checkbox
// checked on the Product Details page, same column layout as the full
// Products export.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const rows = await buildProductExportRows(supabase, { posSquareOnly: true });
  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename("Square-POS-Data-Map", "csv")}"`,
    },
  });
}

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/exportFilename";
import { buildProductExportRows } from "@/lib/productCsvExport";
import { logCsvEvent } from "@/lib/productCsvEvents";

// A real export of every product's current values, in the exact column
// layout bulkUploadProducts expects -- download, edit only what needs to
// change, re-upload. Every field round-trips as-is, so an unedited row
// re-applies the same value it already had (a no-op), and the upload's
// per-row "only touch when present" rules (product_type, category,
// supplier) mean leaving a cell as exported never overwrites something
// else by accident.
export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const rows = await buildProductExportRows(supabase);
  const csv = toCsv(rows);

  await logCsvEvent(supabase, { direction: "download", kind: "export", performedBy: profile.id });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename("Products-Export", "csv")}"`,
    },
  });
}

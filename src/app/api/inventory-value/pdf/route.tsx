import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildInventoryReport } from "@/lib/inventoryReport";
import { InventoryReportDocument } from "@/lib/pdf/InventoryReportDocument";
import { exportFilename } from "@/lib/exportFilename";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const rows = await buildInventoryReport(supabase);

  const buffer = await renderToBuffer(
    (<InventoryReportDocument rows={rows} generatedAt={new Date().toLocaleString()} />) as any
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename("Inventory-Value", "pdf")}"`,
    },
  });
}

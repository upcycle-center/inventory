import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildMonthEndValueLines, filterMonthEndValueLines, groupMonthEndValueLines } from "@/lib/monthEndValue";
import { parseMonthEndReportParams } from "@/lib/monthEndReportParams";
import { lineValue } from "@/lib/inventoryValue";
import { MonthEndValueReportDocument } from "@/lib/pdf/MonthEndValueReportDocument";
import { exportFilename } from "@/lib/exportFilename";
import { MONTH_NAMES } from "@/lib/monthNames";

// Always organized by Category, regardless of whatever grouping was
// active on screen -- a fixed, printable layout rather than a snapshot
// of an ad-hoc on-screen slice.
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const params = parseMonthEndReportParams(Object.fromEntries(searchParams));
  const supabase = createClient();

  const allLines = await buildMonthEndValueLines(supabase, params.year, params.month, lineValue);
  const lines = filterMonthEndValueLines(allLines, params.filters);
  const { groups, grandTotal } = groupMonthEndValueLines(lines, "category");

  const buffer = await renderToBuffer(
    (
      <MonthEndValueReportDocument
        title="moEND TOT Inventory Value"
        monthLabel={`${MONTH_NAMES[params.month - 1]} ${params.year}`}
        groups={groups}
        grandTotal={grandTotal}
      />
    ) as any
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename("moEND-Inventory-Value", "pdf")}"`,
    },
  });
}

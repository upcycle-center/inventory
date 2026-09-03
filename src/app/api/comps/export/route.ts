import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/exportFilename";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const { data: comps } = await supabase
    .from("comp_records")
    .select(
      "quantity, note, created_at, product:products(sku, description), location:locations(name), event:events(name, event_date), user:profiles(name)"
    )
    .order("created_at", { ascending: false });

  const rows = (comps as any[]) ?? [];

  const csv = toCsv([
    ["Date", "Event", "Location", "IC", "Product", "Qty (EA)", "Logged By", "Note"],
    ...rows.map((r) => [
      r.created_at ?? "",
      r.event?.name ?? "",
      r.location?.name ?? "",
      r.product?.sku ?? "",
      r.product?.description ?? "",
      r.quantity ?? "",
      r.user?.name ?? "",
      r.note ?? "",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename("Comps", "csv")}"`,
    },
  });
}

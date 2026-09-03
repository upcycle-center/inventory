import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/exportFilename";
import { lineValue } from "@/lib/inventoryValue";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const { data: recoveries } = await supabase
    .from("inventory_movements")
    .select(
      "quantity, qty_cases, qty_each, created_at, product:products(sku, description, case_cost, case_size), from_location:locations!inventory_movements_from_location_id_fkey(name), to_location:locations!inventory_movements_to_location_id_fkey(name), user:profiles(name)"
    )
    .eq("type", "recovery")
    .order("created_at", { ascending: false });

  const rows = (recoveries as any[]) ?? [];

  const csv = toCsv([
    ["Date", "From", "To", "SKU", "Product", "Qty Cases", "Qty Each", "Qty (EA equiv)", "Value", "Logged By"],
    ...rows.map((r) => [
      r.created_at ?? "",
      r.from_location?.name ?? "",
      r.to_location?.name ?? "",
      r.product?.sku ?? "",
      r.product?.description ?? "",
      r.qty_cases ?? 0,
      r.qty_each ?? 0,
      r.quantity ?? 0,
      r.product ? lineValue(r.qty_each, r.qty_cases, r.product).toFixed(2) : "0.00",
      r.user?.name ?? "",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename("Recoveries", "csv")}"`,
    },
  });
}

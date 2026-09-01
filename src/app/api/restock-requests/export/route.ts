import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { getRestockUnitByProductId } from "@/lib/restockUnit";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "warehouse"].includes(profile.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const [{ data: requests }, unitByProductId] = await Promise.all([
    supabase
      .from("inventory_thresholds")
      .select(
        "product_id, reorder_threshold, requested_at, product:products(sku, description), location:locations(name), requested_by_profile:profiles(name)"
      )
      .not("requested_at", "is", null)
      .order("requested_at", { ascending: true }),
    getRestockUnitByProductId(supabase),
  ]);

  const rows = (requests as any[]) ?? [];

  const csv = toCsv([
    ["Location", "IC", "Product", "Unit", "Threshold", "Requested By", "Requested At"],
    ...rows.map((r) => [
      r.location?.name ?? "",
      r.product?.sku ?? "",
      r.product?.description ?? "",
      unitByProductId.get(r.product_id) ?? "case",
      r.reorder_threshold ?? "",
      r.requested_by_profile?.name ?? "",
      r.requested_at ?? "",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="restock-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

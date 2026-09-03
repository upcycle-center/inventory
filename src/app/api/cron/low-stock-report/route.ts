import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { eachEquivalent, getOnHandByProductId } from "@/lib/onHand";
import { getRestockUnitByProductId } from "@/lib/restockUnit";
import { getSystemNotificationRecipients } from "@/lib/notifications";
import { toCsv } from "@/lib/csv";

// Vercel Cron calls this daily with `Authorization: Bearer ${CRON_SECRET}`
// (see vercel.json). Anyone else gets a 401 — this route reads across every
// location's counts, so it can't be left open. It also has no user
// session (Cron sends no cookies), so it must use the service role —
// the anon client would have every RLS policy that requires
// auth.role() = 'authenticated' silently return zero rows.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: thresholdRows } = await supabase
    .from("inventory_thresholds")
    .select("product_id, location_id, reorder_threshold, product:products(sku, description, case_size)")
    .gt("reorder_threshold", 0);

  const rows = (thresholdRows as any[]) ?? [];
  if (!rows.length) {
    return Response.json({ sent: false, reason: "no thresholds configured" });
  }

  const locationIds = [...new Set(rows.map((r) => r.location_id))];
  const { data: locations } = await supabase.from("locations").select("id, name").in("id", locationIds);
  const locationNameById = new Map(((locations as { id: string; name: string }[] | null) ?? []).map((l) => [l.id, l.name]));

  const onHandByLocation = new Map<string, Awaited<ReturnType<typeof getOnHandByProductId>>>();
  for (const locationId of locationIds) {
    onHandByLocation.set(locationId, await getOnHandByProductId(supabase, locationId));
  }
  const restockUnitByProductId = await getRestockUnitByProductId(supabase);

  const lowItems = rows
    .map((t) => {
      const onHand = onHandByLocation.get(t.location_id)?.get(t.product_id);
      const onHandTotal = eachEquivalent(onHand?.qty_each, onHand?.qty_cases, t.product?.case_size);
      return {
        location: locationNameById.get(t.location_id) ?? t.location_id,
        sku: t.product?.sku ?? "",
        description: t.product?.description ?? "",
        unit: restockUnitByProductId.get(t.product_id) ?? "case",
        onHand: onHandTotal,
        threshold: t.reorder_threshold as number,
      };
    })
    .filter((item) => item.onHand <= item.threshold);

  if (!lowItems.length) {
    return Response.json({ sent: false, reason: "no items below threshold" });
  }

  const emails = await getSystemNotificationRecipients(supabase, "requests");

  if (!emails.length) {
    return Response.json({ sent: false, reason: "no opted-in recipients", lowItemCount: lowItems.length });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ sent: false, reason: "RESEND_API_KEY not configured", lowItemCount: lowItems.length });
  }

  const today = new Date().toISOString().slice(0, 10);
  const csv = toCsv([
    ["Location", "IC", "Product", "Unit", "On-Hand", "Threshold"],
    ...lowItems.map((i) => [i.location, i.sku, i.description, i.unit, i.onHand, i.threshold]),
  ]);

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.REPORT_FROM_EMAIL || "BWP Legends Operations <noreply@mercado.solutions>",
    to: emails,
    subject: `BWP Legends Ops: ${today} Daily Low Stock Report (${lowItems.length} item${lowItems.length === 1 ? "" : "s"})`,
    html: `<p>${lowItems.length} item(s) at or below their restock threshold. Full list attached.</p>`,
    attachments: [{ filename: `low-stock-${today}.csv`, content: Buffer.from(csv).toString("base64") }],
  });

  return Response.json({ sent: true, lowItemCount: lowItems.length, recipients: emails.length });
}

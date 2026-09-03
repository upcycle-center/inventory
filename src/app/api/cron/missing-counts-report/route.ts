import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getSystemNotificationRecipients } from "@/lib/notifications";
import { toCsv } from "@/lib/csv";

// Vercel Cron calls this daily at the same time the count window closes
// (see vercel.json), with `Authorization: Bearer ${CRON_SECRET}`. Flags
// every open+confirmed location for a currently "open" event that never
// got a closing count submitted. Uses the service role — Cron sends no
// session cookies, so the anon client would have every RLS policy that
// requires auth.role() = 'authenticated' silently return zero rows.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: events } = await supabase.from("events").select("id, name, event_date").eq("status", "open");
  const eventRows = (events as { id: string; name: string; event_date: string }[] | null) ?? [];
  if (!eventRows.length) {
    return Response.json({ sent: false, reason: "no open events" });
  }
  const eventIds = eventRows.map((e) => e.id);
  const eventById = new Map(eventRows.map((e) => [e.id, e]));

  const { data: eventLocations } = await supabase
    .from("event_locations")
    .select("event_id, location_id, location:locations(id, name)")
    .in("event_id", eventIds)
    .eq("is_open", true)
    .eq("confirmed", true);
  const readyRows = (eventLocations as any[]) ?? [];
  if (!readyRows.length) {
    return Response.json({ sent: false, reason: "no open/confirmed locations" });
  }

  const { data: closingCounts } = await supabase
    .from("location_counts")
    .select("event_id, location_id")
    .in("event_id", eventIds)
    .eq("type", "closing");
  const submitted = new Set(
    ((closingCounts as { event_id: string; location_id: string }[] | null) ?? []).map(
      (c) => `${c.event_id}:${c.location_id}`
    )
  );

  const { data: assignments } = await supabase
    .from("event_location_assignments")
    .select("event_id, location_id, location_lead:profiles(name)")
    .in("event_id", eventIds);
  const leadByKey = new Map(
    ((assignments as any[]) ?? []).map((a) => [`${a.event_id}:${a.location_id}`, a.location_lead?.name ?? ""])
  );

  const missing = readyRows
    .filter((r) => !submitted.has(`${r.event_id}:${r.location_id}`))
    .map((r) => ({
      event: eventById.get(r.event_id)?.name ?? r.event_id,
      eventDate: eventById.get(r.event_id)?.event_date ?? "",
      location: r.location?.name ?? r.location_id,
      lead: leadByKey.get(`${r.event_id}:${r.location_id}`) || "— Unassigned —",
    }));

  if (!missing.length) {
    return Response.json({ sent: false, reason: "no missing closing counts" });
  }

  const emails = await getSystemNotificationRecipients(supabase, "counts");
  if (!emails.length) {
    return Response.json({ sent: false, reason: "no opted-in recipients", missingCount: missing.length });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ sent: false, reason: "RESEND_API_KEY not configured", missingCount: missing.length });
  }

  const today = new Date().toISOString().slice(0, 10);
  const csv = toCsv([
    ["Event", "Event Date", "Location", "Lead"],
    ...missing.map((m) => [m.event, m.eventDate, m.location, m.lead]),
  ]);

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.REPORT_FROM_EMAIL || "BWP Legends Operations <noreply@mercado.solutions>",
    to: emails,
    subject: `${today} Missing Closing Counts (${missing.length} location${missing.length === 1 ? "" : "s"})`,
    html: `<p>${missing.length} location(s) confirmed open haven't submitted a closing count. Full list attached.</p>`,
    attachments: [{ filename: `missing-counts-${today}.csv`, content: Buffer.from(csv).toString("base64") }],
  });

  return Response.json({ sent: true, missingCount: missing.length, recipients: emails.length });
}

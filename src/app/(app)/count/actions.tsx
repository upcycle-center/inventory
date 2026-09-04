"use server";

import { redirect } from "next/navigation";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { CountConfirmationDocument } from "@/lib/pdf/CountConfirmationDocument";
import { countSheetFilename } from "@/lib/exportFilename";
import { easternDateTimeString } from "@/lib/easternTime";
import type { CountType } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CountLineInput {
  product_id: string;
  qty_each: number | null;
  qty_cases: number | null;
}

export interface WasteLineInput {
  product_id: string;
  quantity: number;
}

export interface CompLineInput {
  product_id: string;
  quantity: number;
}

export async function submitCount(
  eventId: string,
  locationId: string,
  type: CountType,
  lines: CountLineInput[],
  notes?: string,
  wasteLines?: WasteLineInput[],
  compLines?: CompLineInput[]
): Promise<{ error: string } | void> {
  const profile = await requireProfile();
  const supabase = createClient();

  const nonEmptyLines = lines.filter((l) => l.qty_each !== null || l.qty_cases !== null);
  if (nonEmptyLines.length === 0) {
    return { error: "Enter at least one quantity before submitting." };
  }

  const { data: thisEvent } = await supabase.from("events").select("event_date").eq("id", eventId).single();
  if (thisEvent) {
    const { data: earlierOpenEvents } = await supabase
      .from("events")
      .select("id")
      .eq("status", "open")
      .lt("event_date", thisEvent.event_date)
      .neq("id", eventId)
      .limit(1);
    if (earlierOpenEvents?.length) {
      return { error: "An earlier event is still open. Events must be completed in date order." };
    }
  }

  const { data: count, error: countError } = await supabase
    .from("location_counts")
    .insert({
      event_id: eventId,
      location_id: locationId,
      user_id: profile.id,
      type,
      notes: notes?.trim() || null,
    })
    .select("id")
    .single();

  if (countError || !count) {
    return { error: countError?.message ?? "Could not start the count." };
  }

  const { error: linesError } = await supabase.from("location_count_lines").insert(
    nonEmptyLines.map((l) => ({
      location_count_id: count.id,
      product_id: l.product_id,
      qty_each: l.qty_each,
      qty_cases: l.qty_cases,
    }))
  );

  if (linesError) {
    return { error: linesError.message };
  }

  if (wasteLines?.length) {
    await supabase.from("waste_records").insert(
      wasteLines.map((w) => ({
        event_id: eventId,
        location_id: locationId,
        product_id: w.product_id,
        quantity: w.quantity,
        reason_code: "other" as const,
        note: "Logged via closing count sheet",
        user_id: profile.id,
      }))
    );
  }

  if (compLines?.length) {
    await supabase.from("comp_records").insert(
      compLines.map((c) => ({
        event_id: eventId,
        location_id: locationId,
        product_id: c.product_id,
        quantity: c.quantity,
        note: "Logged via closing count sheet",
        user_id: profile.id,
      }))
    );
  }

  if (type === "closing") {
    await maybeCloseEvent(eventId);
    await sendClosingCountConfirmation(supabase, {
      eventId,
      locationId,
      submittedByName: profile.name,
      submittedByEmail: profile.email,
      lines: nonEmptyLines,
      wasteLines: wasteLines ?? [],
      compLines: compLines ?? [],
      notes: notes?.trim() || null,
    });
  }

  redirect(`/count?event=${eventId}&location=${locationId}`);
}

// Emails the submitting user a PDF confirming exactly what they just closed
// out with — the digital equivalent of handing them a copy of the paper
// count sheet. Best-effort: a failure here (missing API key, Resend error)
// must never block the count from having been recorded.
async function sendClosingCountConfirmation(
  supabase: SupabaseClient,
  {
    eventId,
    locationId,
    submittedByName,
    submittedByEmail,
    lines,
    wasteLines,
    compLines,
    notes,
  }: {
    eventId: string;
    locationId: string;
    submittedByName: string;
    submittedByEmail: string;
    lines: CountLineInput[];
    wasteLines: WasteLineInput[];
    compLines: CompLineInput[];
    notes: string | null;
  }
) {
  if (!submittedByEmail || !process.env.RESEND_API_KEY) return;

  try {
    const [{ data: event }, { data: location }, { data: products }] = await Promise.all([
      supabase.from("events").select("name, event_date").eq("id", eventId).single(),
      supabase.from("locations").select("name, yellow_dog_code").eq("id", locationId).single(),
      supabase
        .from("products")
        .select("id, sku, description")
        .in("id", [...new Set([...lines, ...wasteLines, ...compLines].map((l) => l.product_id))]),
    ]);
    if (!location) return;

    const productById = new Map(((products as { id: string; sku: string; description: string }[] | null) ?? []).map((p) => [p.id, p]));
    const describe = (productId: string) => productById.get(productId) ?? { sku: productId, description: productId };

    const buffer = await renderToBuffer(
      (
        <CountConfirmationDocument
          type="closing"
          locationName={location.name}
          yellowDogCode={location.yellow_dog_code}
          eventName={event?.name ?? null}
          eventDate={event?.event_date ?? null}
          submittedByName={submittedByName}
          submittedAt={easternDateTimeString()}
          lines={lines.map((l) => ({ ...describe(l.product_id), qtyEach: l.qty_each, qtyCases: l.qty_cases }))}
          wasteLines={wasteLines.map((w) => ({ ...describe(w.product_id), quantity: w.quantity }))}
          compLines={compLines.map((c) => ({ ...describe(c.product_id), quantity: c.quantity }))}
          notes={notes}
        />
      ) as any
    );

    const filename = countSheetFilename({
      eventName: event?.name ?? null,
      yellowDogCode: location.yellow_dog_code,
      locationName: location.name,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.REPORT_FROM_EMAIL || "BWP Legends Operations <noreply@mercado.solutions>",
      to: submittedByEmail,
      subject: `Closing count received — ${location.yellow_dog_code ? `${location.yellow_dog_code} — ` : ""}${location.name}`,
      html: `<p>Thanks — your closing count for <strong>${location.name}</strong>${event?.name ? ` (${event.name})` : ""} has been received. A copy is attached as a PDF.</p>`,
      attachments: [{ filename, content: buffer.toString("base64") }],
    });
  } catch (err) {
    console.error("Failed to send closing count confirmation email", err);
  }
}

// Once every open+confirmed location for the event has a closing count on
// file, the event is done — flip it to closed automatically instead of
// waiting on an admin. Uses the service role since events writes are
// admin-only by RLS, but this runs for whichever stand lead happens to
// submit the last one.
async function maybeCloseEvent(eventId: string) {
  const supabase = createClient();

  const { data: readyLocations } = await supabase
    .from("event_locations")
    .select("location_id")
    .eq("event_id", eventId)
    .eq("is_open", true)
    .eq("confirmed", true);
  const readyLocationIds = ((readyLocations as { location_id: string }[] | null) ?? []).map((r) => r.location_id);
  if (!readyLocationIds.length) return;

  const { data: closingCounts } = await supabase
    .from("location_counts")
    .select("location_id")
    .eq("event_id", eventId)
    .eq("type", "closing")
    .in("location_id", readyLocationIds);
  const submittedLocationIds = new Set(
    ((closingCounts as { location_id: string }[] | null) ?? []).map((c) => c.location_id)
  );
  const allSubmitted = readyLocationIds.every((id) => submittedLocationIds.has(id));
  if (!allSubmitted) return;

  const admin = createServiceRoleClient();
  await admin.from("events").update({ status: "closed" }).eq("id", eventId).eq("status", "open");
}

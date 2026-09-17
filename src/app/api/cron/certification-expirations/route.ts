import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { easternDateString } from "@/lib/easternTime";
import { governingCertificationType } from "@/lib/staff";
import type { CertificationType, Staff } from "@/lib/supabase/types";

const LOOKAHEAD_DAYS = 30;

// Vercel Cron calls this daily with `Authorization: Bearer ${CRON_SECRET}`
// (see vercel.json). Reminds a Roster member directly at the email on
// their record -- they aren't necessarily system users, so there's no
// notification_categories subscription to check here, unlike the other
// cron reports. Content is a placeholder; the real copy comes later.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const today = easternDateString();
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() + LOOKAHEAD_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Anyone certified, expiring within the lookahead window (or already
  // expired -- still "at risk" until they renew), with an email on file.
  const [{ data: staffRaw }, { data: certTypesRaw }] = await Promise.all([
    supabase
      .from("staff")
      .select("*")
      .eq("active", true)
      .eq("certified", true)
      .not("certification_expires_at", "is", null)
      .not("email", "is", null)
      .lte("certification_expires_at", cutoffStr),
    supabase.from("certification_types").select("*").eq("active", true),
  ]);

  const atRisk = (staffRaw as Staff[] | null) ?? [];
  if (!atRisk.length) {
    return Response.json({ sent: false, reason: "no certifications expiring or expired within the lookahead window" });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ sent: false, reason: "RESEND_API_KEY not configured", atRiskCount: atRisk.length });
  }

  const certTypes = (certTypesRaw as CertificationType[] | null) ?? [];
  const resend = new Resend(process.env.RESEND_API_KEY);

  let remindersSent = 0;
  for (const person of atRisk) {
    const governingType = governingCertificationType(person, certTypes);
    const certName = governingType?.name ?? "your certification";
    const isExpired = person.certification_expires_at! < today;

    await resend.emails.send({
      from: process.env.REPORT_FROM_EMAIL || "BWP Legends Operations <noreply@mercado.solutions>",
      to: person.email!,
      subject: isExpired
        ? `Action needed: your ${certName} certification has expired`
        : `Reminder: your ${certName} certification expires soon`,
      html: `<p>Hi ${person.first_name}, this is a placeholder reminder that your ${certName} certification ${
        isExpired ? `expired on ${person.certification_expires_at}` : `expires on ${person.certification_expires_at}`
      }. Please renew it.</p>`,
    });
    remindersSent += 1;
  }

  return Response.json({ sent: true, remindersSent });
}

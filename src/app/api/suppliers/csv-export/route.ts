import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { exportFilename } from "@/lib/exportFilename";
import type { Supplier } from "@/lib/supabase/types";

const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDays(days: string[]): string {
  return DAY_ORDER.filter((d) => days.includes(d)).join(" ");
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("*").order("name");
  const rows = (suppliers as Supplier[] | null) ?? [];

  const csv = toCsv([
    [
      "Company",
      "Acct #",
      "Website",
      "Office Number",
      "Rep First Name",
      "Rep Last Name",
      "Rep Email",
      "Rep Mobile",
      "Billing First Name",
      "Billing Last Name",
      "Billing Email",
      "Billing Mobile",
      "Order By",
      "Deliver On",
      "Logistics Notes",
      "Needs Review",
    ],
    ...rows.map((s) => [
      s.name,
      s.account_number ?? "",
      s.website ?? "",
      s.office_phone ?? "",
      s.representative_first_name ?? "",
      s.representative_last_name ?? "",
      s.representative_email ?? "",
      s.representative_phone ?? "",
      s.billing_first_name ?? "",
      s.billing_last_name ?? "",
      s.billing_email ?? "",
      s.billing_phone ?? "",
      formatDays(s.order_by_days),
      formatDays(s.delivery_days),
      s.logistics_notes ?? "",
      s.needs_review ? "Yes" : "No",
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename("Suppliers", "csv")}"`,
    },
  });
}

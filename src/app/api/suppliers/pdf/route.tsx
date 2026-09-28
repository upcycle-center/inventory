import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SuppliersDocument } from "@/lib/pdf/SuppliersDocument";
import { exportFilename } from "@/lib/exportFilename";
import { easternDateTimeString } from "@/lib/easternTime";
import type { Supplier } from "@/lib/supabase/types";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("*").order("name");

  const buffer = await renderToBuffer(
    (<SuppliersDocument suppliers={(suppliers as Supplier[] | null) ?? []} generatedAt={easternDateTimeString()} />) as any
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename("Suppliers", "pdf")}"`,
    },
  });
}

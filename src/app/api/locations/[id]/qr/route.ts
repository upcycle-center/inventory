import QRCode from "qrcode";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Encodes an absolute URL to this location's /checkin landing page -- print
// this and post it at the stand. Scanning it always lands on the same
// page; what that page shows depends on the stand's current count status.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient();
  const { data: location } = await supabase.from("locations").select("id, name").eq("id", params.id).single();
  if (!location) return new Response("Not found", { status: 404 });

  const { searchParams, origin } = new URL(request.url);
  const checkinUrl = `${origin}/checkin/${location.id}`;

  const buffer = await QRCode.toBuffer(checkinUrl, { type: "png", width: 512, margin: 2 });

  const filenameSafeLocation = location.name.replace(/[^a-zA-Z0-9]+/g, "-");
  const disposition = searchParams.get("download")
    ? `attachment; filename="QR-${filenameSafeLocation}.png"`
    : "inline";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}

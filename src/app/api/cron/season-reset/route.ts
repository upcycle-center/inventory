import { createServiceRoleClient } from "@/lib/supabase/server";

// Vercel Cron calls this once a year on January 1 (see vercel.json) with
// `Authorization: Bearer ${CRON_SECRET}`. Only clears ready_to_work --
// certification records/dates are left untouched, so a still-valid
// certification jumps straight back to Cleared once someone's marked
// ready again for the new season; only an actually-expired one (or a
// newly-added required certification) blocks it. Admin/Ops don't go
// through the onboarding pipeline, so they're excluded.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceRoleClient();

  await Promise.all([
    supabase.from("staff").update({ ready_to_work: false }).eq("active", true),
    supabase.from("profiles").update({ ready_to_work: false }).eq("active", true).neq("role", "admin").neq("role", "ops"),
  ]);

  return Response.json({ reset: true });
}

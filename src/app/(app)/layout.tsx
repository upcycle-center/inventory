import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllowedViewsForRole } from "@/lib/permissions";
import { Nav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const allowedViews = await getAllowedViewsForRole(supabase, profile.role);

  return (
    <div className="min-h-screen">
      <Nav profile={profile} allowedViews={[...allowedViews]} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

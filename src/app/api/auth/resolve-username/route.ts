import { createServiceRoleClient } from "@/lib/supabase/server";

// Resolves a username to the email Supabase Auth actually signs in with.
// Runs pre-authentication, so it uses the service role (profiles isn't
// meant to be publicly queryable) and always returns 200 with a null
// email on no match, rather than a distinct 404, to avoid making
// username enumeration any easier than it has to be.
export async function POST(request: Request) {
  const { username } = await request.json().catch(() => ({ username: "" }));
  const normalized = String(username || "").trim().toLowerCase();
  if (!normalized) return Response.json({ email: null });

  // Usernames are always stored lowercased (see invite/edit actions), so
  // this is an exact match, not a pattern — avoids ilike wildcard quirks
  // if a username ever contains % or _.
  const admin = createServiceRoleClient();
  const { data } = await admin.from("profiles").select("email").eq("username", normalized).maybeSingle();

  return Response.json({ email: data?.email ?? null });
}

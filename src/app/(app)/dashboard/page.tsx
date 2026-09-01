import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  if (profile.role === "stand_lead") {
    const { data: assignments } = await supabase
      .from("event_location_assignments")
      .select("id, event_id, location_id, event:events(id, name, event_date, status), location:locations(id, name)")
      .eq("location_lead_user_id", profile.id)
      .order("created_at", { ascending: false });

    const rows = (assignments as any[]) ?? [];
    const eventIds = [...new Set(rows.map((a) => a.event_id))];
    const { data: eventLocations } = eventIds.length
      ? await supabase.from("event_locations").select("event_id, location_id, is_open, confirmed").in("event_id", eventIds)
      : { data: [] as any[] };

    const confirmedOpen = new Set(
      ((eventLocations as any[]) ?? [])
        .filter((el) => el.is_open && el.confirmed)
        .map((el) => `${el.event_id}:${el.location_id}`)
    );

    return (
      <div>
        <h1 className="mb-6 text-lg font-semibold">Your Assignments</h1>
        {!rows.length ? (
          <p className="text-sm text-gray-500">
            You have no location assignments yet. Check with your event admin.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((a: any) => {
              const isOpen = confirmedOpen.has(`${a.event_id}:${a.location_id}`);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium">{a.location?.name}</p>
                    <p className="text-sm text-gray-500">
                      {a.event?.name} · {a.event?.event_date} ·{" "}
                      <span className="uppercase">{a.event?.status}</span>
                    </p>
                  </div>
                  {isOpen ? (
                    <Link
                      href={`/count?event=${a.event?.id}&location=${a.location?.id}`}
                      className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
                    >
                      Open count
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">Not confirmed open yet</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const [{ count: locationCount }, { count: openEvents }, { count: openRequests }] =
    await Promise.all([
      supabase.from("locations").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase
        .from("inventory_thresholds")
        .select("*", { count: "exact", head: true })
        .not("requested_at", "is", null),
    ]);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Active locations" value={locationCount ?? 0} href="/admin/locations" />
        <SummaryCard label="Open events" value={openEvents ?? 0} href="/admin/events" />
        <SummaryCard
          label="Open restock requests"
          value={openRequests ?? 0}
          href="/restock-requests"
        />
      </div>
      <div className="mt-8 flex gap-3">
        <Link href="/receive" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Receive
        </Link>
        <Link
          href="/transfer"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          Transfer
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-gray-200 bg-white p-5 hover:border-brand"
    >
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </Link>
  );
}

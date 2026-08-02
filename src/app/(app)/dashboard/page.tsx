import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  if (profile.role === "stand_lead") {
    const { data: assignments } = await supabase
      .from("event_stand_assignments")
      .select("id, event:events(id, name, event_date, status), stand:stands(id, name)")
      .eq("stand_lead_user_id", profile.id)
      .order("created_at", { ascending: false });

    return (
      <div>
        <h1 className="mb-6 text-lg font-semibold">Your Stand Assignments</h1>
        {!assignments || assignments.length === 0 ? (
          <p className="text-sm text-gray-500">
            You have no stand assignments yet. Check with your event admin.
          </p>
        ) : (
          <ul className="space-y-3">
            {assignments.map((a: any) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{a.stand?.name}</p>
                  <p className="text-sm text-gray-500">
                    {a.event?.name} · {a.event?.event_date} ·{" "}
                    <span className="uppercase">{a.event?.status}</span>
                  </p>
                </div>
                <Link
                  href={`/count?event=${a.event?.id}&stand=${a.stand?.id}`}
                  className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
                >
                  Open count
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const [{ count: standCount }, { count: openEvents }, { count: thresholdBreaches }] =
    await Promise.all([
      supabase.from("stands").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase
        .from("inventory_thresholds")
        .select("*", { count: "exact", head: true }),
    ]);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Overview</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Active stands" value={standCount ?? 0} href="/admin/stands" />
        <SummaryCard label="Open events" value={openEvents ?? 0} href="/admin/events" />
        <SummaryCard
          label="Thresholds configured"
          value={thresholdBreaches ?? 0}
          href="/admin/thresholds"
        />
      </div>
      <div className="mt-8 flex gap-3">
        <Link href="/receive" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Receive shipment
        </Link>
        <Link
          href="/replenish"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          Replenish a stand
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

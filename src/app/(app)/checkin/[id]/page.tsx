import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LocationLabel } from "@/components/LocationLabel";
import { locationDisplayName } from "@/lib/locationLabel";
import { formatTimestamp } from "@/lib/relativeTime";
import type { CountType } from "@/lib/supabase/types";

// The permanent landing page a stand's printed QR code always points to.
// What it shows depends on the stand's current status for whichever event
// is currently open here -- Open Stand, then In Progress (yellow) after
// the opening count, then a submitted confirmation once closed.
export default async function CheckinPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile(["admin", "warehouse", "stand_lead", "kitchen", "catering"]);
  const supabase = createClient();
  const locationId = params.id;

  const { data: location } = await supabase.from("locations").select("*").eq("id", locationId).eq("active", true).single();
  if (!location) {
    return <p className="text-sm text-gray-500">Location not found.</p>;
  }

  const breadcrumb = (
    <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: locationDisplayName(location) }]} />
  );

  const { data: openLocationRows } = await supabase
    .from("event_locations")
    .select("event:events(id, name, event_date, status)")
    .eq("location_id", locationId)
    .eq("is_open", true)
    .eq("confirmed", true);

  const currentEvent = ((openLocationRows as any[]) ?? [])
    .map((r) => r.event)
    .filter((e) => e && e.status === "open")
    .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))[0] as
    | { id: string; name: string; event_date: string }
    | undefined;

  if (!currentEvent) {
    return (
      <div>
        {breadcrumb}
        <h1 className="mb-2 text-lg font-semibold">
          <LocationLabel location={location} />
        </h1>
        <p className="text-sm text-gray-500">No open stand right now here. Check with your event admin.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-brand hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (profile.role === "stand_lead" && location.backup_lead_user_id !== profile.id) {
    const { data: assignment } = await supabase
      .from("event_location_assignments")
      .select("id")
      .eq("event_id", currentEvent.id)
      .eq("location_id", locationId)
      .eq("location_lead_user_id", profile.id)
      .maybeSingle();

    if (!assignment) {
      return (
        <div>
          {breadcrumb}
          <p className="text-sm text-gray-500">
            You&apos;re not assigned to <LocationLabel location={location} /> for {currentEvent.name}. Check with
            your event admin.
          </p>
        </div>
      );
    }
  }

  const { data: existingCounts } = await supabase
    .from("location_counts")
    .select("type, submitted_at, user:profiles(name)")
    .eq("event_id", currentEvent.id)
    .eq("location_id", locationId);

  const rows = (existingCounts as { type: CountType; submitted_at: string; user: { name: string } | null }[] | null) ?? [];
  const doneTypes = new Set(rows.map((r) => r.type));
  const closingRow = rows.find((r) => r.type === "closing");

  return (
    <div>
      {breadcrumb}
      <p className="mb-1 text-sm text-gray-500">
        {currentEvent.name} · {currentEvent.event_date}
      </p>
      <h1 className="mb-6 text-lg font-semibold">
        <LocationLabel location={location} />
      </h1>

      {closingRow ? (
        <div className="max-w-lg rounded-md border border-gray-200 bg-white p-6">
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">✓ Count Sheet Submitted</p>
            <p className="text-sm text-green-700">
              {formatTimestamp(closingRow.submitted_at)}
              {closingRow.user?.name ? ` · Submitted by ${closingRow.user.name}` : ""}
            </p>
          </div>
          <p className="mb-3 text-sm text-gray-500">Need to move stock from this stand?</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/transfer?location=${locationId}`}
              className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Transfer
            </Link>
            <Link
              href={`/request?location=${locationId}`}
              className="rounded-md bg-yellow-400 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-500"
            >
              Request
            </Link>
            <Link
              href={`/recovery?location=${locationId}`}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Recovery
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-lg rounded-md border border-gray-200 bg-white p-8 text-center">
          <Link
            href={`/count?event=${currentEvent.id}&location=${locationId}`}
            className={
              doneTypes.has("opening")
                ? "inline-block rounded-md bg-yellow-400 px-6 py-3 text-base font-medium text-gray-900 hover:bg-yellow-500"
                : "inline-block rounded-md bg-brand px-6 py-3 text-base font-medium text-white"
            }
          >
            {doneTypes.has("opening") ? "Stand In Progress — Tap to Close" : "Open Stand"}
          </Link>
          {doneTypes.has("opening") && (
            <p className="mt-3 text-xs text-gray-400">Opening count submitted — scan again at close to finish.</p>
          )}
        </div>
      )}
    </div>
  );
}

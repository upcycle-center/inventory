import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRoleLandingData } from "@/lib/roleLandingData";
import { RoleActionButtons } from "@/components/RoleActionButtons";
import { LocationLabel } from "@/components/LocationLabel";

export default async function StandPage() {
  const profile = await requireProfile(["admin", "stand_lead"]);
  const supabase = createClient();
  const { allowedViews, pendingRequestCount, draftTypes } = await getRoleLandingData(supabase, "stand_lead", profile.id);

  const { data: assignments } = await supabase
    .from("event_location_assignments")
    .select("id, event_id, location_id, event:events(id, name, event_date, status), location:locations(id, name, yellow_dog_code)")
    .eq("location_lead_user_id", profile.id)
    .order("created_at", { ascending: false });

  const rows = (assignments as any[]) ?? [];
  const eventIds = [...new Set(rows.map((a) => a.event_id))];
  const { data: eventLocations } = eventIds.length
    ? await supabase.from("event_locations").select("event_id, location_id, is_open, confirmed").in("event_id", eventIds)
    : { data: [] as any[] };

  const eventStatusById = new Map(rows.map((a) => [a.event_id, a.event?.status]));
  const confirmedOpen = new Set(
    ((eventLocations as any[]) ?? [])
      .filter((el) => el.is_open && el.confirmed && eventStatusById.get(el.event_id) === "open")
      .map((el) => `${el.event_id}:${el.location_id}`)
  );

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Stand</h1>
      <RoleActionButtons allowedViews={allowedViews} pendingRequestCount={pendingRequestCount} draftTypes={draftTypes} />

      <h2 className="mb-3 text-base font-semibold">Your Assignments</h2>
      {!rows.length ? (
        <p className="text-sm text-gray-500">You have no location assignments yet. Check with your event admin.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((a: any) => {
            const isOpen = confirmedOpen.has(`${a.event_id}:${a.location_id}`);
            return (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4">
                <div>
                  <p className="font-medium">{a.location && <LocationLabel location={a.location} />}</p>
                  <p className="text-sm text-gray-500">
                    {a.event?.name} · {a.event?.event_date} · <span className="uppercase">{a.event?.status}</span>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EventLocation, Location, LocationStaffRole, LocationStaffTier, Profile } from "@/lib/supabase/types";
import { STAFF_ROLES, STAFF_ROLE_SHORT_LABEL } from "@/lib/staffRoles";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { updateEventStatus } from "../actions";
import { confirmLocationStaffing, postTotTickets, toggleLocationOpen, unlockLocationStaffing, updateEstTickets } from "./actions";
import { LocationLeadSelect } from "./LocationLeadSelect";

function effectiveCount(
  role: LocationStaffRole,
  tiers: LocationStaffTier[],
  attendance: number | null
): { count: number; note: string | null } {
  let count = role.base_count;
  let note: string | null = null;

  if (attendance != null) {
    const tier = tiers.find(
      (t) =>
        t.role_name === role.role_name &&
        attendance >= t.min_attendance &&
        (t.max_attendance == null || attendance < t.max_attendance)
    );
    if (tier) {
      count = tier.count;
      note = `tier: ${tier.min_attendance}${tier.max_attendance ? `–${tier.max_attendance}` : "+"} attendance`;
    }
  }

  return { count, note };
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: event }, { data: locations }, { data: users }, { data: assignments }, { data: eventLocations }] =
    await Promise.all([
      supabase
        .from("events")
        .select("*, tot_tickets_posted_by_profile:profiles(id, name)")
        .eq("id", params.id)
        .single(),
      supabase.from("locations").select("*").eq("active", true).eq("type", "stand").order("name"),
      supabase.from("profiles").select("*").order("name"),
      supabase
        .from("event_location_assignments")
        .select("id, location_id, location_lead_user_id, location:locations(id, name), location_lead:profiles(id, name)")
        .eq("event_id", params.id),
      supabase
        .from("event_locations")
        .select("*, confirmed_by_profile:profiles(id, name)")
        .eq("event_id", params.id),
    ]);

  if (!event) notFound();

  const locationIds = ((locations as Location[] | null) ?? []).map((l) => l.id);
  const [{ data: staffRoles }, { data: staffTiers }] = await Promise.all([
    locationIds.length
      ? supabase.from("location_staff_roles").select("*").in("location_id", locationIds).order("sort_order")
      : Promise.resolve({ data: [] as LocationStaffRole[] }),
    locationIds.length
      ? supabase.from("location_staff_tiers").select("*").in("location_id", locationIds)
      : Promise.resolve({ data: [] as LocationStaffTier[] }),
  ]);

  const eventLocationByLocationId = new Map(
    ((eventLocations as any[] | null) ?? []).map((el) => [el.location_id, el as EventLocation & { confirmed_by_profile: Profile | null }])
  );
  const openByLocationId = new Map(
    Array.from(eventLocationByLocationId.entries()).map(([id, el]) => [id, el.is_open])
  );
  const leadUserIdByLocationId = new Map(
    ((assignments as any[] | null) ?? []).map((a) => [a.location_id, a.location_lead_user_id as string])
  );
  const rolesByLocationId = new Map<string, LocationStaffRole[]>();
  for (const role of (staffRoles as LocationStaffRole[] | null) ?? []) {
    const list = rolesByLocationId.get(role.location_id) ?? [];
    list.push(role);
    rolesByLocationId.set(role.location_id, list);
  }
  const tiers = (staffTiers as LocationStaffTier[] | null) ?? [];

  // Total recommended staff (fixed Lead + tier-driven roles) for all open
  // locations, at a given attendance figure — used to compare the
  // EST-driven plan against the posted TOT (actual) attendance.
  function totalRecommendedStaff(attendance: number | null) {
    return ((locations as Location[] | null) ?? []).reduce((total, l) => {
      const isOpen = openByLocationId.get(l.id) ?? true;
      if (!isOpen) return total;
      const roles = rolesByLocationId.get(l.id) ?? [];
      const roleTotal = STAFF_ROLES.reduce((sum, roleName) => {
        const role = roles.find((r) => r.role_name === roleName);
        return role ? sum + effectiveCount(role, tiers, attendance).count : sum;
      }, 0);
      return total + 1 + roleTotal;
    }, 0);
  }

  const estRecommended = totalRecommendedStaff(event.est_tickets);
  const totRecommended = event.tot_tickets_posted_at ? totalRecommendedStaff(event.tot_tickets) : null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Events", href: "/admin/events" },
          { label: event.name },
        ]}
      />
      <h1 className="mb-1 text-lg font-semibold">{event.name}</h1>
      <p className="mb-6 text-sm text-gray-500">{event.event_date}</p>

      <ActionForm action={updateEventStatus} savedLabel="Status updated" className="mb-8 flex items-center gap-2">
        <input type="hidden" name="id" value={event.id} />
        <label className="text-sm text-gray-500">Status</label>
        <select name="status" defaultValue={event.status} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
          <option value="upcoming">Upcoming</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-sm">
          Update
        </button>
      </ActionForm>

      <div className="mb-8 flex flex-wrap gap-4">
        <ActionForm
          action={updateEstTickets}
          savedLabel="EST updated"
          className="flex items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
        >
          <input type="hidden" name="event_id" value={event.id} />
          <div>
            <label className="mb-1 block text-xs text-gray-500" title="Estimate from latest ticket sales — drives staffing projections below">
              EST Tickets
            </label>
            <input
              name="est_tickets"
              type="number"
              min={0}
              step={1}
              defaultValue={event.est_tickets ?? ""}
              placeholder="e.g. 2500"
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-sm">
            Update
          </button>
        </ActionForm>

        <ActionForm
          action={postTotTickets}
          savedLabel="TOT posted"
          className="flex items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
        >
          <input type="hidden" name="event_id" value={event.id} />
          <div>
            <label className="mb-1 block text-xs text-gray-500" title="Actual final count reported to the Stands day-of">
              TOT Tickets
            </label>
            <input
              name="tot_tickets"
              type="number"
              min={0}
              step={1}
              defaultValue={event.tot_tickets ?? ""}
              placeholder="e.g. 2650"
              className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
            Post
          </button>
          {event.tot_tickets_posted_at && (
            <span className="text-xs text-gray-400" title={event.tot_tickets_posted_at}>
              Posted{(event as any).tot_tickets_posted_by_profile?.name ? ` by ${(event as any).tot_tickets_posted_by_profile.name}` : ""}
            </span>
          )}
        </ActionForm>
      </div>

      {totRecommended != null && totRecommended !== estRecommended && (
        <div
          className={`mb-8 rounded-md border p-3 text-sm ${
            totRecommended > estRecommended
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-blue-300 bg-blue-50 text-blue-800"
          }`}
        >
          Posted TOT Tickets ({event.tot_tickets}) recommend <strong>{totRecommended}</strong> total staff vs{" "}
          <strong>{estRecommended}</strong> planned from EST ({event.est_tickets ?? "—"}) —{" "}
          {totRecommended > estRecommended ? "UNDER" : "OVER"}-staffed by {Math.abs(totRecommended - estRecommended)}.
        </div>
      )}

      <div className="mb-8 overflow-x-auto rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium">Locations</p>
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="pb-2 pr-3 whitespace-nowrap">Location</th>
              <th className="pb-2 pr-3"></th>
              <th className="pb-2 pr-3 whitespace-nowrap" title="Fixed baseline — always 1 when open">
                Lead
              </th>
              {STAFF_ROLES.map((r) => (
                <th key={r} className="pb-2 pr-3 whitespace-nowrap" title={r}>
                  {STAFF_ROLE_SHORT_LABEL[r]}
                </th>
              ))}
              <th className="pb-2 pr-3">Total</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let grandTotal = 0;

              const rows = ((locations as Location[] | null) ?? []).map((l) => {
                const isOpen = openByLocationId.get(l.id) ?? true;
                const eventLocation = eventLocationByLocationId.get(l.id);
                const confirmed = eventLocation?.confirmed ?? false;
                const roles = rolesByLocationId.get(l.id) ?? [];

                // A closed location needs nobody: every role reads 0, not
                // just the total. An open location always needs at least
                // the (1) Stand Lead — that's a fixed baseline, not a
                // configurable role/tier.
                const roleCounts = STAFF_ROLES.map((roleName) => {
                  if (!isOpen) return { roleName, count: 0, note: "Closed" };
                  const role = roles.find((r) => r.role_name === roleName);
                  if (!role) return { roleName, count: null as number | null, note: null as string | null };
                  const { count, note } = effectiveCount(role, tiers, event.est_tickets);
                  return { roleName, count, note };
                });
                const leadCount = isOpen ? 1 : 0;
                const roleTotal = roleCounts.reduce((sum, r) => sum + (r.count ?? 0), 0);
                const recommended = leadCount + roleTotal;
                const displayedStaff = !isOpen
                  ? 0
                  : confirmed
                    ? eventLocation?.confirmed_staff_count ?? recommended
                    : recommended;
                grandTotal += displayedStaff;

                return { location: l, isOpen, eventLocation, confirmed, roleCounts, recommended, displayedStaff };
              });

              return (
                <>
                  {rows.map(({ location, isOpen, eventLocation, confirmed, roleCounts, recommended, displayedStaff }) => (
                    <tr key={location.id} className="border-t border-gray-100">
                      <td className="whitespace-nowrap py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <form action={toggleLocationOpen} className="shrink-0">
                            <input type="hidden" name="event_id" value={event.id} />
                            <input type="hidden" name="location_id" value={location.id} />
                            <input type="hidden" name="is_open" value={String(isOpen)} />
                            <button
                              type="submit"
                              className={
                                isOpen
                                  ? "rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                                  : "rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300"
                              }
                            >
                              {isOpen ? "Open" : "Closed"}
                            </button>
                          </form>
                          <Link href={`/admin/locations/${location.id}`} className="text-brand hover:underline">
                            {location.yellow_dog_code && (
                              <span className="mr-1 font-mono text-xs text-gray-400">{location.yellow_dog_code}</span>
                            )}
                            {location.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <LocationLeadSelect
                          eventId={event.id}
                          locationId={location.id}
                          currentLeadId={leadUserIdByLocationId.get(location.id) ?? null}
                          defaultLeadId={location.default_lead_user_id}
                          users={(users as Profile[] | null) ?? []}
                          disabled={confirmed}
                        />
                      </td>
                      <td className="py-2 pr-3 text-center">
                        {isOpen ? 1 : <span className="text-gray-300">—</span>}
                      </td>
                      {roleCounts.map(({ roleName, count, note }) => (
                        <td key={roleName} className="py-2 pr-3 text-center" title={note ?? undefined}>
                          {count == null ? <span className="text-gray-300">—</span> : count}
                        </td>
                      ))}
                      <td className="py-2 pr-3 font-medium">
                        {displayedStaff}
                        {confirmed && recommended !== displayedStaff && (
                          <span className="ml-1 text-xs text-amber-600" title="Recalculated recommendation has changed since this was confirmed">
                            (now {recommended})
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        {confirmed ? (
                          <form action={unlockLocationStaffing} className="flex items-center gap-2">
                            <input type="hidden" name="event_id" value={event.id} />
                            <input type="hidden" name="location_id" value={location.id} />
                            <span className="text-xs text-gray-400" title={eventLocation?.confirmed_at ?? ""}>
                              🔒 Confirmed{eventLocation?.confirmed_by_profile?.name ? ` by ${eventLocation.confirmed_by_profile.name}` : ""}
                            </span>
                            <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-xs">
                              Unlock
                            </button>
                          </form>
                        ) : (
                          <form action={confirmLocationStaffing}>
                            <input type="hidden" name="event_id" value={event.id} />
                            <input type="hidden" name="location_id" value={location.id} />
                            <input type="hidden" name="staff_count" value={recommended} />
                            <button
                              type="submit"
                              disabled={!leadUserIdByLocationId.get(location.id)}
                              className="rounded-md bg-brand px-3 py-1 text-xs text-white disabled:opacity-40"
                            >
                              Confirm
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={STAFF_ROLES.length + 5} className="py-4 text-gray-400">
                        No locations available.
                      </td>
                    </tr>
                  )}
                  {rows.length > 0 && (
                    <tr className="border-t border-gray-200">
                      <td colSpan={3 + STAFF_ROLES.length} />
                      <td className="py-2 pr-3 font-medium">{grandTotal}</td>
                      <td />
                    </tr>
                  )}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

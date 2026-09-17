import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EventLocation, Location, LocationStaffRole, LocationStaffTier, Profile, ShiftCallOut, Staff } from "@/lib/supabase/types";
import { STAFF_ROLES, STAFF_ROLE_SHORT_LABEL } from "@/lib/staffRoles";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { updateEventStatus } from "../actions";
import {
  confirmLocationStaffing,
  toggleLocationOpen,
  unlockLocationStaffing,
  updateEventAttendance,
} from "./actions";
import { LocationLeadSelect } from "./LocationLeadSelect";
import { WfmEditableCells } from "./WfmEditableCells";
import { CallOutsLog } from "./CallOutsLog";
import { DeleteEventButton } from "./DeleteEventButton";
import { effectiveCount, totalRecommendedStaff as totalRecommendedStaffAcross } from "@/lib/staffing";
import { easternDateTimeString } from "@/lib/easternTime";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: event }, { data: locations }, { data: users }, { data: assignments }, { data: eventLocations }, { data: activeStaff }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "*, tot_tickets_posted_by_profile:profiles!events_tot_tickets_posted_by_fkey(id, name), attendance_updated_by_profile:profiles!events_attendance_updated_by_fkey(id, name)"
        )
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
      supabase.from("staff").select("*").eq("active", true).order("last_name").order("first_name"),
    ]);

  const { data: callOuts } = await supabase
    .from("shift_call_outs")
    .select("*, reported_by_profile:profiles(id, name), staff:staff(id, first_name, last_name)")
    .eq("event_id", params.id)
    .order("created_at", { ascending: false });

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
  const totalRecommendedStaff = (attendance: number | null) =>
    totalRecommendedStaffAcross(locationIds, openByLocationId, rolesByLocationId, tiers, attendance);

  const estRecommended = totalRecommendedStaff(event.est_tickets);
  const totRecommended = event.tot_tickets_posted_at ? totalRecommendedStaff(event.tot_tickets) : null;

  const locationNameById = new Map(((locations as Location[] | null) ?? []).map((l) => [l.id, l.name]));
  const staffList = (activeStaff as Staff[] | null) ?? [];
  const callOutList = ((callOuts as any[] | null) ?? []) as (ShiftCallOut & {
    reported_by_profile: Profile | null;
    staff: Staff | null;
  })[];

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

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ActionForm action={updateEventStatus} savedLabel="Status updated" className="flex items-center gap-2">
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
          <a
            href={`/api/count-sheet/pdf/all?event=${event.id}`}
            className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
          >
            Download All Count Sheets
          </a>
        </div>
        <DeleteEventButton eventId={event.id} />
      </div>

      <div className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        {event.attendance_updated_at && (
          <p className="mb-3 text-xs text-gray-400">
            Last updated{(event as any).attendance_updated_by_profile?.name ? ` by ${(event as any).attendance_updated_by_profile.name}` : ""} on{" "}
            {easternDateTimeString(new Date(event.attendance_updated_at))}
          </p>
        )}
        <ActionForm action={updateEventAttendance} savedLabel="Attendance updated" className="flex flex-col gap-4">
          <input type="hidden" name="event_id" value={event.id} />
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
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
                className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>

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
                className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500" title="Headcount for the Green Room — reference only, not factored into stand staffing">
                GRN Room
              </label>
              <input
                name="grn_room_attendance"
                type="number"
                min={0}
                step={1}
                defaultValue={event.grn_room_attendance ?? ""}
                placeholder="e.g. 40"
                className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500" title="Headcount for the VIP Lounge — reference only, not factored into stand staffing">
                VIP Lounge
              </label>
              <input
                name="vip_lounge_attendance"
                type="number"
                min={0}
                step={1}
                defaultValue={event.vip_lounge_attendance ?? ""}
                placeholder="e.g. 75"
                className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
            Update
          </button>
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
        <p className="mb-1 text-sm font-medium">WFM Shifts</p>
        <p className="mb-3 text-sm text-gray-500">
          Role counts are pre-filled with the suggested headcount — adjust before confirming if needed. Once
          confirmed, Unlock to make changes; picking Call-Out or No-Show as the reason logs it automatically for
          whichever role you reduce.
        </p>
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="pb-2 pr-3 whitespace-nowrap">Location</th>
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
              let leadColumnTotal = 0;
              const roleColumnTotals = new Map<string, number>();

              const rows = ((locations as Location[] | null) ?? []).map((l) => {
                const isOpen = openByLocationId.get(l.id) ?? true;
                const eventLocation = eventLocationByLocationId.get(l.id);
                const confirmed = eventLocation?.confirmed ?? false;
                const roles = rolesByLocationId.get(l.id) ?? [];
                const confirmedRoleCounts = (eventLocation?.confirmed_role_counts as Record<string, number> | null) ?? null;

                // A closed location needs nobody: every role reads 0, not
                // just the total. An open location always needs at least
                // the (1) Stand Lead — that's a fixed baseline, not a
                // configurable role/tier. displayCount is what's actually
                // shown for a confirmed row (the confirmed/adjusted count,
                // not the freshly recomputed suggestion) -- used for both
                // the row itself and the column totals below, so the two
                // can't drift apart the way they did when the totals summed
                // the raw suggestion instead of what was actually confirmed.
                const roleCounts = STAFF_ROLES.map((roleName) => {
                  if (!isOpen) return { roleName, count: 0, note: "Closed", displayCount: 0 };
                  const role = roles.find((r) => r.role_name === roleName);
                  if (!role) return { roleName, count: null as number | null, note: null as string | null, displayCount: null as number | null };
                  const { count, note } = effectiveCount(role, tiers, event.est_tickets);
                  const displayCount = confirmed ? confirmedRoleCounts?.[roleName] ?? count : count;
                  return { roleName, count, note, displayCount };
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
                leadColumnTotal += leadCount;
                for (const { roleName, displayCount } of roleCounts) {
                  roleColumnTotals.set(roleName, (roleColumnTotals.get(roleName) ?? 0) + (displayCount ?? 0));
                }

                return { location: l, isOpen, eventLocation, confirmed, roleCounts, recommended, displayedStaff };
              });

              return (
                <>
                  {rows.map(({ location, isOpen, eventLocation, confirmed, roleCounts, recommended, displayedStaff }) => (
                    <tr key={location.id} className="border-t border-gray-100">
                      <td className="whitespace-nowrap py-2 pr-3">
                        {!confirmed && (
                          <form id={`confirm-form-${location.id}`} action={confirmLocationStaffing}>
                            <input type="hidden" name="event_id" value={event.id} />
                            <input type="hidden" name="location_id" value={location.id} />
                          </form>
                        )}
                        <div className="flex flex-col items-start gap-1.5">
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
                          <LocationLeadSelect
                            eventId={event.id}
                            locationId={location.id}
                            currentLeadId={leadUserIdByLocationId.get(location.id) ?? null}
                            defaultLeadId={location.default_lead_user_id}
                            users={(users as Profile[] | null) ?? []}
                            disabled={confirmed}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-center">
                        {isOpen ? 1 : <span className="text-gray-300">—</span>}
                      </td>
                      {confirmed ? (
                        <>
                          {roleCounts.map(({ roleName, count, note, displayCount }) => (
                            <td key={roleName} className="py-2 pr-3 text-center" title={note ?? undefined}>
                              {count == null ? <span className="text-gray-300">—</span> : displayCount}
                            </td>
                          ))}
                          <td className="py-2 pr-3 font-medium">{displayedStaff}</td>
                          <td className="py-2">
                            <form action={unlockLocationStaffing} className="flex flex-wrap items-start gap-2">
                              <input type="hidden" name="event_id" value={event.id} />
                              <input type="hidden" name="location_id" value={location.id} />
                              <div className="text-left text-xs leading-tight text-gray-400">
                                <p>🔒 Confirmed by:</p>
                                <p className="text-gray-600">{eventLocation?.confirmed_by_profile?.name ?? "—"}</p>
                                {eventLocation?.confirmed_at && <p>{easternDateTimeString(new Date(eventLocation.confirmed_at))}</p>}
                              </div>
                              <select
                                name="reason"
                                defaultValue="other"
                                title="Reason for unlocking — auto-logs any role you then reduce, once you save the change"
                                className="rounded-md border border-gray-300 px-1 py-1 text-xs"
                              >
                                <option value="other">Adjustment</option>
                                <option value="call_out">Call-Out</option>
                                <option value="no_show">No-Show</option>
                              </select>
                              <select
                                name="staff_id"
                                defaultValue=""
                                title="Optional — who this Call-Out/No-Show is, if known"
                                className="rounded-md border border-gray-300 px-1 py-1 text-xs"
                              >
                                <option value="">— Staff —</option>
                                {staffList.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.first_name} {s.last_name}
                                  </option>
                                ))}
                              </select>
                              <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-xs">
                                Unlock
                              </button>
                            </form>
                          </td>
                        </>
                      ) : (
                        <WfmEditableCells
                          formId={`confirm-form-${location.id}`}
                          roleCounts={roleCounts}
                          previousCounts={(eventLocation?.confirmed_role_counts as Record<string, number> | null) ?? null}
                          recommended={recommended}
                          confirmDisabled={isOpen && !leadUserIdByLocationId.get(location.id)}
                          isOpen={isOpen}
                        />
                      )}
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={STAFF_ROLES.length + 4} className="py-4 text-gray-400">
                        No locations available.
                      </td>
                    </tr>
                  )}
                  {rows.length > 0 && (
                    <tr className="border-t border-gray-200 font-medium">
                      <td />
                      <td className="py-2 pr-3 text-center">{leadColumnTotal}</td>
                      {STAFF_ROLES.map((roleName) => (
                        <td key={roleName} className="py-2 pr-3 text-center">
                          {roleColumnTotals.get(roleName) ?? 0}
                        </td>
                      ))}
                      <td className="py-2 pr-3">{grandTotal}</td>
                      <td />
                    </tr>
                  )}
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

      <div className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm font-medium">Staffing Changes Log</p>
        <p className="mb-3 text-sm text-gray-500">
          Logged automatically whenever a confirmed shift is unlocked and a role&apos;s count is reduced — Call-Out,
          No-Show, or a plain Adjustment. Tracks trends and helps spot staffing gaps.
        </p>
        <CallOutsLog eventId={event.id} callOuts={callOutList} locationNameById={locationNameById} />
      </div>
    </div>
  );
}

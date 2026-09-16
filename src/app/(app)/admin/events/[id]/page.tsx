import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EventLocation, Location, LocationStaffRole, LocationStaffTier, Profile, ShiftCallOut } from "@/lib/supabase/types";
import { STAFF_ROLES, STAFF_ROLE_SHORT_LABEL } from "@/lib/staffRoles";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { updateEventStatus } from "../actions";
import {
  confirmLocationStaffing,
  deleteShiftCallOut,
  logShiftCallOut,
  toggleLocationOpen,
  unlockLocationStaffing,
  updateEventAttendance,
} from "./actions";
import { LocationLeadSelect } from "./LocationLeadSelect";
import { DeleteEventButton } from "./DeleteEventButton";
import { effectiveCount, totalRecommendedStaff as totalRecommendedStaffAcross } from "@/lib/staffing";
import { easternDateTimeString } from "@/lib/easternTime";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: event }, { data: locations }, { data: users }, { data: assignments }, { data: eventLocations }] =
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
    ]);

  const { data: callOuts } = await supabase
    .from("shift_call_outs")
    .select("*, reported_by_profile:profiles(id, name)")
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

  // Call-outs are logged against a specific stand's confirmed team, so the
  // log form only offers locations that are actually open and confirmed.
  const confirmedOpenLocations = ((locations as Location[] | null) ?? []).filter((l) => {
    const el = eventLocationByLocationId.get(l.id);
    return (openByLocationId.get(l.id) ?? true) && (el?.confirmed ?? false);
  });
  const shiftRoleOptions = ["Stand Lead", ...STAFF_ROLES];
  const locationNameById = new Map(((locations as Location[] | null) ?? []).map((l) => [l.id, l.name]));
  const callOutList = ((callOuts as any[] | null) ?? []) as (ShiftCallOut & { reported_by_profile: Profile | null })[];

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
        <p className="mb-3 text-sm font-medium">WFM Shifts</p>
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
                leadColumnTotal += leadCount;
                for (const { roleName, count } of roleCounts) {
                  roleColumnTotals.set(roleName, (roleColumnTotals.get(roleName) ?? 0) + (count ?? 0));
                }

                return { location: l, isOpen, eventLocation, confirmed, roleCounts, recommended, displayedStaff };
              });

              return (
                <>
                  {rows.map(({ location, isOpen, eventLocation, confirmed, roleCounts, recommended, displayedStaff }) => (
                    <tr key={location.id} className="border-t border-gray-100">
                      <td className="whitespace-nowrap py-2 pr-3">
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
                              defaultValue=""
                              title="Reason for unlocking — Call-Out/No-Show also logs it below, by role"
                              className="rounded-md border border-gray-300 px-1 py-1 text-xs"
                            >
                              <option value="">Adjust (other)</option>
                              <option value="call_out">Call-Out</option>
                              <option value="no_show">No-Show</option>
                            </select>
                            <select
                              name="role_name"
                              defaultValue={shiftRoleOptions[0]}
                              title="Role — only used when the reason above is Call-Out or No-Show"
                              className="rounded-md border border-gray-300 px-1 py-1 text-xs"
                            >
                              {shiftRoleOptions.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-xs">
                              Unlock
                            </button>
                          </form>
                        ) : (
                          <form action={confirmLocationStaffing} className="flex items-center gap-1.5">
                            <input type="hidden" name="event_id" value={event.id} />
                            <input type="hidden" name="location_id" value={location.id} />
                            <input
                              name="staff_count"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={recommended}
                              title="Recommended headcount — adjust before confirming if needed"
                              className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-xs"
                            />
                            <button
                              type="submit"
                              disabled={isOpen && !leadUserIdByLocationId.get(location.id)}
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
        <p className="mb-1 text-sm font-medium">Call-Outs / No-Shows</p>
        <p className="mb-3 text-sm text-gray-500">
          Log who&apos;s short day-of, by role, once a stand&apos;s team is confirmed — tracks trends and helps
          bridge staffing gaps.
        </p>

        {confirmedOpenLocations.length > 0 ? (
          <ActionForm action={logShiftCallOut} savedLabel="Logged" className="mb-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="event_id" value={event.id} />
            <label className="text-xs text-gray-500">
              Location
              <select name="location_id" required className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                {confirmedOpenLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500">
              Role
              <select name="role_name" required className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                {shiftRoleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-gray-500">
              Type
              <select name="call_out_type" required className="mt-1 block rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                <option value="call_out">Call-Out</option>
                <option value="no_show">No-Show</option>
              </select>
            </label>
            <label className="min-w-[160px] flex-1 text-xs text-gray-500">
              Note (optional)
              <input
                name="note"
                placeholder="e.g. covered by X"
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs text-white">
              Log
            </button>
          </ActionForm>
        ) : (
          <p className="mb-4 text-sm text-gray-400">Confirm a stand&apos;s team above before logging a call-out.</p>
        )}

        {callOutList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="pb-2 pr-3">Location</th>
                  <th className="pb-2 pr-3">Role</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Note</th>
                  <th className="pb-2 pr-3">Reported</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {callOutList.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-2 pr-3">{locationNameById.get(c.location_id) ?? "—"}</td>
                    <td className="py-2 pr-3">{c.role_name}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.call_out_type === "no_show" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {c.call_out_type === "no_show" ? "No-Show" : "Call-Out"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{c.note ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-gray-400">
                      {c.reported_by_profile?.name ?? "—"} · {easternDateTimeString(new Date(c.created_at))}
                    </td>
                    <td className="py-2">
                      <form action={deleteShiftCallOut}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="event_id" value={event.id} />
                        <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No call-outs or no-shows logged for this event yet.</p>
        )}
      </div>
    </div>
  );
}

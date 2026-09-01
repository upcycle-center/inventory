import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LocationStaffRole, LocationStaffTier } from "@/lib/supabase/types";
import { STAFF_ROLES } from "@/lib/staffRoles";
import { ActionForm } from "@/components/ActionForm";
import { toggleLocationActive } from "../actions";
import { addStaffRole, addStaffTier, removeStaffRole, removeStaffTier, updateLocation } from "./actions";
import { DeleteLocationButton } from "./DeleteLocationButton";

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: location }, { data: staffRoles }, { data: staffTiers }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", params.id).single(),
    supabase.from("location_staff_roles").select("*").eq("location_id", params.id).order("sort_order"),
    supabase.from("location_staff_tiers").select("*").eq("location_id", params.id).order("min_attendance"),
  ]);

  if (!location) notFound();

  const roles = (staffRoles as LocationStaffRole[] | null) ?? [];
  const tiers = (staffTiers as LocationStaffTier[] | null) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">
        {location.yellow_dog_code && (
          <span className="mr-2 font-mono text-gray-400">{location.yellow_dog_code}</span>
        )}
        {location.name}
      </h1>

      <ActionForm
        id="edit-location-form"
        action={updateLocation}
        className="mb-3 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <p className="text-sm font-medium">Location details</p>
        <input type="hidden" name="id" value={location.id} />
        <input name="name" defaultValue={location.name} required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="type" defaultValue={location.type} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="stand">Stand</option>
          <option value="kitchen">Kitchen</option>
          <option value="catering">Catering</option>
          <option value="warehouse">Warehouse</option>
        </select>
        <input
          name="description"
          defaultValue={location.description ?? ""}
          placeholder="Description (optional)"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <label className="text-sm text-gray-600">
          YDC (Yellow Dog Code)
          <input
            name="yellow_dog_code"
            defaultValue={location.yellow_dog_code ?? ""}
            placeholder="000"
            maxLength={3}
            pattern="\d{3}"
            className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-sm"
          />
        </label>
      </ActionForm>

      <div className="mb-8 flex items-center gap-3">
        <button type="submit" form="edit-location-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <Link
          href={`/admin/locations/new?from=${location.id}`}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Duplicate
        </Link>
        <ActionForm action={toggleLocationActive} className="contents" savedLabel={location.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={location.id} />
          <input type="hidden" name="active" value={String(location.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {location.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <DeleteLocationButton locationId={location.id} />
      </div>

      <p className="mb-3 text-sm font-medium">Base staffing needs</p>
      <p className="mb-3 text-sm text-gray-500">
        Positions needed to run this location. Set a required certification if the assigned
        Location Lead can cover that slot themselves (e.g. a Certified Bartender Lead covers the
        Bartender slot) — it&apos;s subtracted automatically on the event page.
      </p>

      <ActionForm
        action={addStaffRole}
        savedLabel="Role added"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="location_id" value={location.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Role</label>
          <select name="role_name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Base count</label>
          <input name="base_count" type="number" min={0} step={1} defaultValue={1} className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Covered by Lead if certified</label>
          <input name="required_certification" placeholder="e.g. Certified Bartender" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add role
        </button>
      </ActionForm>

      <ul className="mb-8 space-y-1">
        {roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
            <span>
              ({r.base_count}) {r.role_name}
              {r.required_certification && (
                <span className="ml-2 text-xs text-gray-400">covered by Lead w/ {r.required_certification}</span>
              )}
            </span>
            <form action={removeStaffRole}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="location_id" value={location.id} />
              <button type="submit" className="text-red-600 hover:underline">
                Remove
              </button>
            </form>
          </li>
        ))}
        {!roles.length && <li className="text-sm text-gray-400">No staffing roles set yet.</li>}
      </ul>

      <p className="mb-3 text-sm font-medium">Attendance tiers</p>
      <p className="mb-3 text-sm text-gray-500">
        Override a role&apos;s count for a given attendance range (e.g. fewer In Seat Servers for
        a smaller show). Leave max blank for &ldquo;and up&rdquo;.
      </p>

      <ActionForm
        action={addStaffTier}
        savedLabel="Tier added"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="location_id" value={location.id} />
        <div>
          <label className="mb-1 block text-xs text-gray-500">Role</label>
          <select name="role_name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Min attendance</label>
          <input name="min_attendance" type="number" min={0} step={1} defaultValue={0} className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Max attendance</label>
          <input name="max_attendance" type="number" min={0} step={1} placeholder="and up" className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Count</label>
          <input name="count" type="number" min={0} step={1} required className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add tier
        </button>
      </ActionForm>

      <ul className="mb-8 space-y-1">
        {tiers.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
            <span>
              {t.role_name}: {t.min_attendance}
              {t.max_attendance ? `–${t.max_attendance}` : "+"} attendance → ({t.count})
            </span>
            <form action={removeStaffTier}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="location_id" value={location.id} />
              <button type="submit" className="text-red-600 hover:underline">
                Remove
              </button>
            </form>
          </li>
        ))}
        {!tiers.length && <li className="text-sm text-gray-400">No attendance tiers set yet.</li>}
      </ul>
    </div>
  );
}

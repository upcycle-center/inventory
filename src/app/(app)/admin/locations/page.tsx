import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/supabase/types";
import { createLocation, toggleLocationStatus } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { easternDateTimeString } from "@/lib/easternTime";
import { requireProfile } from "@/lib/auth";

const TYPE_LABEL: Record<Location["type"], string> = {
  warehouse: "Warehouse",
  stand: "Stand",
  kitchen: "Kitchen",
  catering: "Catering",
};

export default async function AdminLocationsPage() {
  const profile = await requireProfile();
  const canEdit = profile.role === "admin";
  const supabase = createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("*, status_updated_by_profile:profiles!locations_status_updated_by_fkey(id, name)")
    .order("type")
    .order("name");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Locations" }]} />
      <h1 className="mb-6 text-lg font-semibold">Locations</h1>

      {canEdit && (
        <ActionForm action={createLocation} savedLabel="Location added" resetOnSuccess className="mb-8 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium">Add a location</p>
          <input name="name" placeholder="Name (e.g. Main Bar)" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select name="type" defaultValue="stand" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="stand">Stand</option>
            <option value="kitchen">Kitchen</option>
            <option value="catering">Catering</option>
            <option value="warehouse">Warehouse</option>
          </select>
          <input name="description" placeholder="Description (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input
            name="yellow_dog_code"
            placeholder="Yellow Dog code (3 digits, optional)"
            maxLength={3}
            pattern="\d{3}"
            className="w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
            Add location
          </button>
        </ActionForm>
      )}

      <table className="w-full text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="px-3 pb-2">Name</th>
            <th className="px-3 pb-2">Type</th>
            <th className="px-3 pb-2">Status</th>
            <th className="px-3 pb-2">Season</th>
          </tr>
        </thead>
        <tbody>
          {(locations as Location[] | null)?.map((l) => (
            <tr key={l.id} className="border-t border-gray-100">
              <td className="px-3 py-2">
                <Link href={`/admin/locations/${l.id}`} className="text-brand hover:underline">
                  {l.yellow_dog_code && <span className="mr-1.5 font-mono text-gray-400">{l.yellow_dog_code}</span>}
                  {l.name}
                </Link>
                {l.description && <span className="ml-2 text-gray-400">{l.description}</span>}
              </td>
              <td className="px-3 py-2 text-gray-500">{TYPE_LABEL[l.type]}</td>
              <td className="px-3 py-2 text-gray-500">{l.active ? "Active" : "Inactive"}</td>
              <td className="px-3 py-2">
                {canEdit ? (
                  <form action={toggleLocationStatus}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="status" value={l.status} />
                    <button
                      type="submit"
                      className={
                        l.status === "open"
                          ? "rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                          : "rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300"
                      }
                    >
                      {l.status === "open" ? "Open" : "Closed"}
                    </button>
                  </form>
                ) : (
                  <span
                    className={
                      l.status === "open"
                        ? "rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white"
                        : "rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600"
                    }
                  >
                    {l.status === "open" ? "Open" : "Closed"}
                  </span>
                )}
                {l.status_updated_at && (
                  <>
                    {(l as any).status_updated_by_profile?.name && (
                      <p className="mt-1 text-xs text-gray-400">by {(l as any).status_updated_by_profile.name}</p>
                    )}
                    <p className="text-xs text-gray-400">{easternDateTimeString(new Date(l.status_updated_at))}</p>
                  </>
                )}
              </td>
            </tr>
          ))}
          {!locations?.length && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-gray-400">
                No locations yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/supabase/types";
import { createLocation } from "./actions";

const TYPE_LABEL: Record<Location["type"], string> = {
  warehouse: "Warehouse",
  stand: "Stand",
  kitchen: "Kitchen",
};

export default async function AdminLocationsPage() {
  const supabase = createClient();
  const { data: locations } = await supabase.from("locations").select("*").order("type").order("name");

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Locations</h1>

      <form action={createLocation} className="mb-8 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium">Add a location</p>
        <input name="name" placeholder="Name (e.g. Main Bar)" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="type" defaultValue="stand" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="stand">Stand</option>
          <option value="kitchen">Kitchen</option>
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
      </form>

      <table className="w-full text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Type</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {(locations as Location[] | null)?.map((l) => (
            <tr key={l.id} className="border-t border-gray-100">
              <td className="py-2">
                <Link href={`/admin/locations/${l.id}`} className="text-brand hover:underline">
                  {l.yellow_dog_code && <span className="mr-1.5 font-mono text-gray-400">{l.yellow_dog_code}</span>}
                  {l.name}
                </Link>
                {l.description && <span className="ml-2 text-gray-400">{l.description}</span>}
              </td>
              <td className="py-2 text-gray-500">{TYPE_LABEL[l.type]}</td>
              <td className="py-2 text-gray-500">{l.active ? "Active" : "Inactive"}</td>
            </tr>
          ))}
          {!locations?.length && (
            <tr>
              <td colSpan={3} className="py-4 text-gray-400">
                No locations yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

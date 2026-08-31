import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { StorageArea } from "@/lib/supabase/types";
import { sortStorageAreas } from "@/lib/storageAreas";
import { createStorageArea, toggleStorageAreaActive } from "./actions";

export default async function AdminStorageAreasPage() {
  const supabase = createClient();
  const { data: rawAreas } = await supabase.from("storage_areas").select("*");
  const areas = sortStorageAreas((rawAreas as StorageArea[]) ?? []);

  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold">Storage Areas</h1>
      <p className="mb-6 text-sm text-gray-500">
        These are the accordion sections Stand Leads browse when counting (Wine Fridge, Beer
        Cage, etc.). Add more anytime — existing codes stay stable once products reference them.
      </p>

      <form action={createStorageArea} className="mb-8 flex max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4">
        <input name="code" placeholder="Code (e.g. WIC)" required maxLength={8} className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase" />
        <input name="name" placeholder="Name (e.g. Walk-in Cooler)" required className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add
        </button>
      </form>

      <table className="w-full max-w-xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Code</th>
            <th className="pb-2">Name</th>
            <th className="pb-2">Status</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a.id} className="border-t border-gray-100">
              <td className="py-2 font-mono">
                <Link href={`/admin/storage-areas/${a.id}`} className="text-brand hover:underline">
                  {a.code}
                </Link>
              </td>
              <td className="py-2">
                <Link href={`/admin/storage-areas/${a.id}`} className="hover:underline">
                  {a.name}
                </Link>
              </td>
              <td className="py-2 text-gray-500">{a.active ? "Active" : "Inactive"}</td>
              <td className="py-2 text-right">
                <form action={toggleStorageAreaActive}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={String(a.active)} />
                  <button type="submit" className="text-brand hover:underline">
                    {a.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createLocation } from "../actions";

export default async function NewLocationPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = createClient();

  const from = searchParams.from
    ? (await supabase.from("locations").select("*").eq("id", searchParams.from).single()).data
    : null;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{from ? "Duplicate location" : "Add location"}</h1>
      {from && (
        <p className="mb-6 text-sm text-gray-500">
          Copied from &ldquo;{from.name}&rdquo;. Give it a new name (and YDC, if it needs one)
          before saving.
        </p>
      )}

      <form
        action={createLocation}
        className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <label className="text-sm text-gray-600">
          Name
          <input name="name" defaultValue={from?.name ?? ""} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Type
          <select name="type" defaultValue={from?.type ?? "stand"} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="stand">Stand</option>
            <option value="kitchen">Kitchen</option>
            <option value="catering">Catering</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </label>
        <label className="text-sm text-gray-600">
          Description (optional)
          <input name="description" defaultValue={from?.description ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          YDC (Yellow Dog Code)
          <input
            name="yellow_dog_code"
            placeholder="000"
            maxLength={3}
            pattern="\d{3}"
            className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-center font-mono text-sm"
          />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Save
          </button>
          <Link href="/admin/locations" className="w-fit rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toggleStorageAreaActive, updateStorageArea } from "../actions";

export default async function StorageAreaDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: area } = await supabase.from("storage_areas").select("*").eq("id", params.id).single();

  if (!area) notFound();

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Edit storage area</h1>

      <form
        id="edit-storage-area-form"
        action={updateStorageArea}
        className="grid max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={area.id} />
        <label className="text-sm text-gray-600">
          Code
          <input
            name="code"
            defaultValue={area.code}
            required
            maxLength={8}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="text-sm text-gray-600">
          Name
          <input name="name" defaultValue={area.name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </form>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" form="edit-storage-area-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <form action={toggleStorageAreaActive} className="contents">
          <input type="hidden" name="id" value={area.id} />
          <input type="hidden" name="active" value={String(area.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {area.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
    </div>
  );
}

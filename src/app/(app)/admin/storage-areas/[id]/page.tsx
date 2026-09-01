import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toggleStorageAreaActive, updateStorageArea } from "../actions";
import { DeleteStorageAreaButton } from "./DeleteStorageAreaButton";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function StorageAreaDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: area } = await supabase.from("storage_areas").select("*").eq("id", params.id).single();

  if (!area) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Storage Areas", href: "/admin/storage-areas" },
          { label: area.name },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">Edit storage area</h1>

      <ActionForm
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
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button type="submit" form="edit-storage-area-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <Link
          href={`/admin/storage-areas/new?from=${area.id}`}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Duplicate
        </Link>
        <ActionForm action={toggleStorageAreaActive} className="contents" savedLabel={area.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={area.id} />
          <input type="hidden" name="active" value={String(area.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {area.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <DeleteStorageAreaButton storageAreaId={area.id} />
      </div>
    </div>
  );
}

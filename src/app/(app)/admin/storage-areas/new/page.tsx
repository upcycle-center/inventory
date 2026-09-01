import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createStorageArea } from "../actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function NewStorageAreaPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = createClient();

  const from = searchParams.from
    ? (await supabase.from("storage_areas").select("*").eq("id", searchParams.from).single()).data
    : null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Storage Areas", href: "/admin/storage-areas" },
          { label: from ? "Duplicate" : "Add" },
        ]}
      />
      <h1 className="mb-1 text-lg font-semibold">{from ? "Duplicate storage area" : "Add storage area"}</h1>
      {from && (
        <p className="mb-6 text-sm text-gray-500">
          Copied from &ldquo;{from.name}&rdquo;. Give it a new, unique code before saving.
        </p>
      )}

      <ActionForm
        action={createStorageArea}
        savedLabel="Storage area saved"
        className="grid max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <label className="text-sm text-gray-600">
          Code
          <input
            name="code"
            placeholder="e.g. WIC"
            required
            maxLength={8}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="text-sm text-gray-600">
          Name
          <input name="name" defaultValue={from?.name ?? ""} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Save
          </button>
          <Link href="/admin/storage-areas" className="w-fit rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
            Cancel
          </Link>
        </div>
      </ActionForm>
    </div>
  );
}

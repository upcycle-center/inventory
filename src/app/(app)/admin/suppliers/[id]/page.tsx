import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { updateSupplier, deleteSupplier } from "../actions";
import { SupplierFields } from "../SupplierFields";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { requireProfile } from "@/lib/auth";

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const canEdit = profile.role === "admin";
  const supabase = createClient();
  const { data: supplierRaw } = await supabase.from("suppliers").select("*").eq("id", params.id).single();
  const supplier = supplierRaw as Supplier | null;

  if (!supplier) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Suppliers", href: "/admin/suppliers" },
          { label: "Edit Supplier" },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">Edit supplier</h1>

      <ActionForm
        id="edit-supplier-form"
        action={updateSupplier}
        backOnSuccess
        className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={supplier.id} />
        <fieldset disabled={!canEdit} className="contents">
          <SupplierFields supplier={supplier} />
        </fieldset>
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        {canEdit && (
          <button
            type="submit"
            form="edit-supplier-form"
            className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Save
          </button>
        )}
        <Link href="/admin/suppliers" className="w-fit rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
          Cancel
        </Link>
        {canEdit && (
          <form action={deleteSupplier}>
            <input type="hidden" name="id" value={supplier.id} />
            <button type="submit" className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
              Delete
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupplier } from "../actions";
import { SupplierFields } from "../SupplierFields";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { requireProfile } from "@/lib/auth";

export default async function NewSupplierPage() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/admin/suppliers");
  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Suppliers", href: "/admin/suppliers" },
          { label: "New Supplier" },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">New supplier</h1>

      <ActionForm id="new-supplier-form" action={createSupplier} className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4">
        <SupplierFields />
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          form="new-supplier-form"
          className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Save
        </button>
        <Link href="/admin/suppliers" className="w-fit rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">
          Cancel
        </Link>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { updateSupplier, deleteSupplier } from "../actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
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
          { label: supplier.name },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">Edit supplier</h1>

      <ActionForm
        id="edit-supplier-form"
        action={updateSupplier}
        className="grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={supplier.id} />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Company
            <input name="name" defaultValue={supplier.name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Acct #
            <input name="account_number" defaultValue={supplier.account_number ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Website
            <input name="website" defaultValue={supplier.website ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Office Number
            <input
              name="office_phone"
              defaultValue={supplier.office_phone ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <p className="mt-2 text-sm font-medium">Acct Rep</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            First Name
            <input
              name="representative_first_name"
              defaultValue={supplier.representative_first_name ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            Last Name
            <input
              name="representative_last_name"
              defaultValue={supplier.representative_last_name ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Email
            <input
              name="representative_email"
              type="email"
              defaultValue={supplier.representative_email ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            Mobile
            <input
              name="representative_phone"
              defaultValue={supplier.representative_phone ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <p className="mt-2 text-sm font-medium">Billing Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            First Name
            <input
              name="billing_first_name"
              defaultValue={supplier.billing_first_name ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            Last Name
            <input
              name="billing_last_name"
              defaultValue={supplier.billing_last_name ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Email
            <input
              name="billing_email"
              type="email"
              defaultValue={supplier.billing_email ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-gray-600">
            Mobile
            <input
              name="billing_phone"
              defaultValue={supplier.billing_phone ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="text-sm text-gray-600">
          Delivery Schedule
          <textarea
            name="delivery_schedule"
            defaultValue={supplier.delivery_schedule ?? ""}
            rows={2}
            placeholder="e.g. Mondays and Thursdays, order by noon the day before"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Logistics Notes
          <textarea
            name="logistics_notes"
            defaultValue={supplier.logistics_notes ?? ""}
            rows={3}
            placeholder="Loading dock access, delivery windows, receiving contact, etc."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          form="edit-supplier-form"
          className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Save
        </button>
        <form action={deleteSupplier}>
          <input type="hidden" name="id" value={supplier.id} />
          <button type="submit" className="w-fit rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

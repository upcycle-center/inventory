import type { Supplier } from "@/lib/supabase/types";

const DAYS = [
  { value: "Sun", label: "Su" },
  { value: "Mon", label: "M" },
  { value: "Tue", label: "Tu" },
  { value: "Wed", label: "W" },
  { value: "Thu", label: "Th" },
  { value: "Fri", label: "F" },
  { value: "Sat", label: "Sa" },
];

function DayCheckboxes({ name, defaultChecked }: { name: string; defaultChecked: string[] }) {
  return (
    <div className="flex gap-3">
      {DAYS.map((d) => (
        <label key={d.value} className="flex flex-col items-center gap-1 text-xs text-gray-600">
          <input type="checkbox" name={name} value={d.value} defaultChecked={defaultChecked.includes(d.value)} className="h-4 w-4" />
          {d.label}
        </label>
      ))}
    </div>
  );
}

// Shared by the New and Edit supplier pages -- same fields, same order,
// just a different set of defaultValues (none for a brand-new supplier).
export function SupplierFields({ supplier }: { supplier?: Partial<Supplier> }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-gray-600">
          Company
          <input name="name" defaultValue={supplier?.name ?? ""} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Acct #
          <input
            name="account_number"
            defaultValue={supplier?.account_number ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-gray-600">
          Website
          <input name="website" defaultValue={supplier?.website ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Office Number
          <input
            name="office_phone"
            defaultValue={supplier?.office_phone ?? ""}
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
            defaultValue={supplier?.representative_first_name ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Last Name
          <input
            name="representative_last_name"
            defaultValue={supplier?.representative_last_name ?? ""}
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
            defaultValue={supplier?.representative_email ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Mobile
          <input
            name="representative_phone"
            defaultValue={supplier?.representative_phone ?? ""}
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
            defaultValue={supplier?.billing_first_name ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Last Name
          <input
            name="billing_last_name"
            defaultValue={supplier?.billing_last_name ?? ""}
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
            defaultValue={supplier?.billing_email ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-gray-600">
          Mobile
          <input
            name="billing_phone"
            defaultValue={supplier?.billing_phone ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Delivery Schedule</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-xs text-gray-500">Order by</p>
            <DayCheckboxes name="order_by_days" defaultChecked={supplier?.order_by_days ?? []} />
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-500">Deliver on</p>
            <DayCheckboxes name="delivery_days" defaultChecked={supplier?.delivery_days ?? []} />
          </div>
        </div>
      </div>
      <label className="text-sm text-gray-600">
        Logistics Notes
        <textarea
          name="logistics_notes"
          defaultValue={supplier?.logistics_notes ?? ""}
          rows={3}
          placeholder="Loading dock access, delivery windows, receiving contact, etc."
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
    </>
  );
}

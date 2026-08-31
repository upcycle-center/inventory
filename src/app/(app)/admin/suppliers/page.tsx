import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/supabase/types";
import { createSupplier, deleteSupplier } from "./actions";

export default async function AdminSuppliersPage() {
  const supabase = createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold">Suppliers</h1>

      <form action={createSupplier} className="mb-8 grid max-w-xl gap-3 rounded-md border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium">Add a supplier</p>
        <input name="name" placeholder="Name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input name="contact_name" placeholder="Contact name" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="contact_phone" placeholder="Contact phone" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <input name="contact_email" type="email" placeholder="Contact email" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="w-fit rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add supplier
        </button>
      </form>

      <table className="w-full text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Contact</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {(suppliers as Supplier[] | null)?.map((s) => (
            <tr key={s.id} className="border-t border-gray-100">
              <td className="py-2">{s.name}</td>
              <td className="py-2 text-gray-500">
                {[s.contact_name, s.contact_email, s.contact_phone].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="py-2 text-right">
                <form action={deleteSupplier}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {!suppliers?.length && (
            <tr>
              <td colSpan={3} className="py-4 text-gray-400">
                No suppliers yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

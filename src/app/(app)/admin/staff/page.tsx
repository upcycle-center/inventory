import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/supabase/types";
import { createStaff, toggleStaffCertified, toggleStaffReady, toggleStaffActive } from "./actions";
import { DeleteStaffButton } from "./DeleteStaffButton";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminStaffPage() {
  const supabase = createClient();
  const { data: staffRaw } = await supabase.from("staff").select("*").order("name");
  const staff = (staffRaw as Staff[] | null) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Staff" }]} />
      <h1 className="mb-2 text-lg font-semibold">Staff</h1>
      <p className="mb-6 text-sm text-gray-500">
        Staff who work stands but aren&apos;t necessarily system users — this roster is what the Call-Out/No-Show
        picker on an event&apos;s page draws from, and tracks who&apos;s certified and ready to work vs. still
        pending requirements.
      </p>

      <ActionForm
        action={createStaff}
        savedLabel="Staff added"
        className="mb-8 flex max-w-md items-center gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input name="name" placeholder="Name" required className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
          Add
        </button>
      </ActionForm>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2 pr-3">Name</th>
            <th className="pb-2 pr-3">Certified</th>
            <th className="pb-2 pr-3">Ready to Work</th>
            <th className="pb-2 pr-3">Status</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} className="border-t border-gray-100">
              <td className={`py-2 pr-3 ${s.active ? "" : "text-gray-400"}`}>{s.name}</td>
              <td className="py-2 pr-3">
                <ActionForm
                  action={toggleStaffCertified}
                  className="contents"
                  savedLabel={s.certified ? "Marked not certified" : "Marked certified"}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="certified" value={String(s.certified)} />
                  <button
                    type="submit"
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.certified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s.certified ? "Certified" : "Not yet"}
                  </button>
                </ActionForm>
              </td>
              <td className="py-2 pr-3">
                <ActionForm
                  action={toggleStaffReady}
                  className="contents"
                  savedLabel={s.ready_to_work ? "Marked pending" : "Marked ready"}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="ready_to_work" value={String(s.ready_to_work)} />
                  <button
                    type="submit"
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.ready_to_work ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {s.ready_to_work ? "Ready" : "Pending"}
                  </button>
                </ActionForm>
              </td>
              <td className="py-2 pr-3">
                <ActionForm action={toggleStaffActive} className="contents" savedLabel={s.active ? "Deactivated" : "Reactivated"}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.active)} />
                  <button type="submit" className="text-xs text-brand hover:underline">
                    {s.active ? "Deactivate" : "Reactivate"}
                  </button>
                </ActionForm>
              </td>
              <td className="py-2">
                <DeleteStaffButton staffId={s.id} />
              </td>
            </tr>
          ))}
          {!staff.length && (
            <tr>
              <td colSpan={5} className="py-4 text-gray-400">
                No staff added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

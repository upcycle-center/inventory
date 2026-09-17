import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/supabase/types";
import { STAFF_MAIN_ROLE_OPTIONS, requiredCertificationLabel, isCertificationExpired } from "@/lib/staff";
import { createStaff } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminStaffPage() {
  const supabase = createClient();
  const { data: staffRaw } = await supabase.from("staff").select("*").order("last_name").order("first_name");
  const staff = (staffRaw as Staff[] | null) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Staff" }]} />
      <h1 className="mb-2 text-lg font-semibold">Staff</h1>
      <p className="mb-6 text-sm text-gray-500">
        Staff who work stands but aren&apos;t necessarily system users — this roster is what the Call-Out/No-Show
        picker on an event&apos;s page draws from. Bartender needs T.E.A.M certification for alcohol service; Server
        Food needs ServeSafe.
      </p>

      <ActionForm
        action={createStaff}
        savedLabel="Staff added"
        className="mb-8 grid max-w-2xl grid-cols-2 gap-3 rounded-md border border-gray-200 bg-white p-4 sm:grid-cols-3"
      >
        <input name="first_name" placeholder="First name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="last_name" placeholder="Last name" required className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select name="main_role" defaultValue="" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Main role</option>
          {STAFF_MAIN_ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select name="cover_role" defaultValue="" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Cover role (optional)</option>
          {STAFF_MAIN_ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input name="phone" placeholder="Phone (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email (optional)" className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="col-span-2 w-fit rounded-md bg-brand px-4 py-2 text-sm text-white sm:col-span-3">
          Add
        </button>
      </ActionForm>

      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="pb-2 pr-3">First Name</th>
              <th className="pb-2 pr-3">Last Name</th>
              <th className="pb-2 pr-3">Main Role</th>
              <th className="pb-2 pr-3">Cover Role</th>
              <th className="pb-2 pr-3">Phone</th>
              <th className="pb-2 pr-3">Email</th>
              <th className="pb-2 pr-3">Certified</th>
              <th className="pb-2 pr-3">Ready to Work</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const requiredCert = requiredCertificationLabel(s.main_role) ?? requiredCertificationLabel(s.cover_role);
              const expired = isCertificationExpired(s.certification_expires_at);
              const missingCert = !!requiredCert && (!s.certified || expired);
              return (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className={`py-2 pr-3 ${s.active ? "" : "text-gray-400"}`}>
                    <Link href={`/admin/staff/${s.id}`} className="text-brand hover:underline">
                      {s.first_name}
                    </Link>
                  </td>
                  <td className={`py-2 pr-3 ${s.active ? "" : "text-gray-400"}`}>{s.last_name}</td>
                  <td className="py-2 pr-3 text-gray-500">{s.main_role ?? "—"}</td>
                  <td className="py-2 pr-3 text-gray-500">{s.cover_role ?? "—"}</td>
                  <td className="py-2 pr-3 text-gray-500">{s.phone ?? "—"}</td>
                  <td className="py-2 pr-3 text-gray-500">{s.email ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.certified && !expired ? "bg-green-100 text-green-700" : missingCert ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                      }`}
                      title={requiredCert ? `Requires ${requiredCert}` : undefined}
                    >
                      {expired ? "Expired" : s.certified ? "Certified" : "Not yet"}
                      {requiredCert ? ` (${requiredCert})` : ""}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.ready_to_work ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {s.ready_to_work ? "Ready" : "Pending"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-gray-500">{s.active ? "Active" : "Inactive"}</td>
                  <td className="py-2">
                    <Link href={`/admin/month-end-reports/call-outs?staff=${s.id}`} className="text-xs text-brand hover:underline">
                      View log →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!staff.length && (
              <tr>
                <td colSpan={10} className="py-4 text-gray-400">
                  No staff added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

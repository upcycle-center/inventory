import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CertificationType, Staff } from "@/lib/supabase/types";
import { STAFF_MAIN_ROLE_OPTIONS, requiredCertificationNames, isCertificationExpired } from "@/lib/staff";
import { USER_ROLE_OPTIONS, ROSTER_ROLE_OPTIONS, ROLE_LABEL_BY_VALUE } from "@/lib/certificationRoles";
import { createStaff, addCertificationType } from "./actions";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminRosterPage() {
  const supabase = createClient();
  const [{ data: staffRaw }, { data: certTypesRaw }] = await Promise.all([
    supabase.from("staff").select("*").order("last_name").order("first_name"),
    supabase.from("certification_types").select("*").order("sort_order"),
  ]);
  const staff = (staffRaw as Staff[] | null) ?? [];
  const certTypes = (certTypesRaw as CertificationType[] | null) ?? [];
  const activeCertTypes = certTypes.filter((t) => t.active);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Roster" }]} />
      <h1 className="mb-2 text-lg font-semibold">Roster</h1>
      <p className="mb-6 text-sm text-gray-500">
        Staff who work stands but aren&apos;t necessarily system users — this roster is what the Call-Out/No-Show
        picker on an event&apos;s page draws from. Which certification each person needs is driven by their Main/Cover
        role, via the certification types below.
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

      <div className="mb-8 max-w-2xl">
        <p className="mb-3 text-sm font-medium">Certification types</p>
        <ActionForm
          action={addCertificationType}
          savedLabel="Added"
          className="mb-3 grid gap-3 rounded-md border border-gray-200 bg-white p-4"
        >
          <div className="flex gap-3">
            <input name="name" placeholder="e.g. T.E.A.M" required className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
              Add
            </button>
          </div>
          <input
            name="description"
            placeholder="Description (optional) — what this certification is for"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div>
            <p className="mb-1 text-xs text-gray-500">Applies to (none checked = everyone)</p>
            <p className="mb-1 text-xs font-medium text-gray-400">Roster roles</p>
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
              {ROSTER_ROLE_OPTIONS.map((r) => (
                <label key={r.value} className="flex items-center gap-1 text-xs text-gray-600">
                  <input type="checkbox" name="applicable_roles" value={r.value} className="h-3.5 w-3.5" />
                  {r.label}
                </label>
              ))}
            </div>
            <p className="mb-1 text-xs font-medium text-gray-400">User roles</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {USER_ROLE_OPTIONS.map((r) => (
                <label key={r.value} className="flex items-center gap-1 text-xs text-gray-600">
                  <input type="checkbox" name="applicable_roles" value={r.value} className="h-3.5 w-3.5" />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
        </ActionForm>
        <ul className="space-y-1">
          {certTypes.map((t) => (
            <li key={t.id} className="rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
              <Link href={`/admin/roster/certifications/${t.id}`} className={t.active ? "text-brand hover:underline" : "text-gray-400 hover:underline"}>
                {t.name}
              </Link>
              <span className="ml-2 text-xs text-gray-400">
                {t.applicable_roles?.length
                  ? t.applicable_roles.map((r) => ROLE_LABEL_BY_VALUE.get(r) ?? r).join(", ")
                  : "Everyone"}
              </span>
              {!t.active && <span className="ml-2 text-xs text-gray-400">(Inactive)</span>}
            </li>
          ))}
          {!certTypes.length && <li className="text-sm text-gray-400">No certification types yet.</li>}
        </ul>
      </div>

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
              const requiredCerts = requiredCertificationNames(s, activeCertTypes);
              const requiredCertLabel = requiredCerts.length ? requiredCerts.join(", ") : null;
              const expired = isCertificationExpired(s.certification_expires_at);
              const missingCert = !!requiredCertLabel && (!s.certified || expired);
              return (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className={`py-2 pr-3 ${s.active ? "" : "text-gray-400"}`}>
                    <Link href={`/admin/roster/${s.id}`} className="text-brand hover:underline">
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
                      title={requiredCertLabel ? `Requires ${requiredCertLabel}` : undefined}
                    >
                      {expired ? "Expired" : s.certified ? "Certified" : "Not yet"}
                      {requiredCertLabel ? ` (${requiredCertLabel})` : ""}
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

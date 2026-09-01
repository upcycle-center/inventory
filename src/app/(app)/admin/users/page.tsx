import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CertificationType, Profile, UserRole } from "@/lib/supabase/types";
import { InviteUserForm } from "./InviteUserForm";
import { RoleSelect } from "./RoleSelect";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/ActionForm";
import { addCertificationType, toggleCertificationTypeActive } from "./actions";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "stand_lead", label: "Stand Lead" },
  { value: "warehouse", label: "Warehouse" },
  { value: "kitchen", label: "Kitchen" },
  { value: "catering", label: "Catering" },
  { value: "ops", label: "Operations" },
  { value: "admin", label: "Admin" },
];

export default async function AdminUsersPage() {
  const supabase = createClient();
  const [{ data: users }, { data: certTypes }] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("certification_types").select("*").order("sort_order"),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Users" }]} />
      <h1 className="mb-6 text-lg font-semibold">Users</h1>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <InviteUserForm />

        <div>
          <p className="mb-3 text-sm font-medium">Certification types</p>
          <ActionForm
            action={addCertificationType}
            savedLabel="Added"
            className="mb-3 grid gap-3 rounded-md border border-gray-200 bg-white p-4"
          >
            <div className="flex gap-3">
              <input name="name" placeholder="e.g. Certified Alcohol" required className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
                Add
              </button>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Applies to (none checked = everyone)</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {ROLE_OPTIONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" name="applicable_roles" value={r.value} className="h-3.5 w-3.5" />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          </ActionForm>
          <ul className="space-y-1">
            {((certTypes as CertificationType[] | null) ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
                <span className={t.active ? "" : "text-gray-400"}>
                  {t.name}
                  <span className="ml-2 text-xs text-gray-400">
                    {t.applicable_roles?.length
                      ? ROLE_OPTIONS.filter((r) => t.applicable_roles?.includes(r.value))
                          .map((r) => r.label)
                          .join(", ")
                      : "Everyone"}
                  </span>
                </span>
                <ActionForm action={toggleCertificationTypeActive} className="contents" savedLabel={t.active ? "Deactivated" : "Reactivated"}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="active" value={String(t.active)} />
                  <button type="submit" className="text-xs text-brand hover:underline">
                    {t.active ? "Deactivate" : "Reactivate"}
                  </button>
                </ActionForm>
              </li>
            ))}
            {!certTypes?.length && <li className="text-sm text-gray-400">No certification types yet.</li>}
          </ul>
        </div>
      </div>

      <div className="w-fit overflow-x-auto">
        <table className="text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="whitespace-nowrap pb-2 pr-6">Name</th>
              <th className="whitespace-nowrap pb-2 pr-6">Email</th>
              <th className="whitespace-nowrap pb-2 pr-6">Phone</th>
              <th className="whitespace-nowrap pb-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {(users as Profile[] | null)?.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="whitespace-nowrap py-2 pr-6">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-brand hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap py-2 pr-6 text-gray-500">{u.email}</td>
                <td className="whitespace-nowrap py-2 pr-6 text-gray-500">{u.phone ?? "—"}</td>
                <td className="whitespace-nowrap py-2">
                  <RoleSelect user={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

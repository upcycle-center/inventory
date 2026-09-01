import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CertificationType, Profile, UserCertification } from "@/lib/supabase/types";
import { certificationStatus } from "@/lib/certifications";
import { InviteUserForm } from "./InviteUserForm";
import { RoleSelect } from "./RoleSelect";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/ActionForm";
import { addCertificationType, toggleCertificationTypeActive } from "./actions";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const [{ data: users }, { data: certTypes }, { data: userCerts }] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("certification_types").select("*").order("sort_order"),
    supabase.from("user_certifications").select("*"),
  ]);

  const activeTypes = ((certTypes as CertificationType[] | null) ?? []).filter((t) => t.active);
  const certsByUserId = new Map<string, Map<string, UserCertification>>();
  for (const cert of (userCerts as UserCertification[] | null) ?? []) {
    const forUser = certsByUserId.get(cert.user_id) ?? new Map<string, UserCertification>();
    forUser.set(cert.certification_type_id, cert);
    certsByUserId.set(cert.user_id, forUser);
  }

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
            className="mb-3 flex gap-3 rounded-md border border-gray-200 bg-white p-4"
          >
            <input name="name" placeholder="e.g. Certified Alcohol" required className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
              Add
            </button>
          </ActionForm>
          <ul className="space-y-1">
            {((certTypes as CertificationType[] | null) ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
                <span className={t.active ? "" : "text-gray-400"}>{t.name}</span>
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

      <table className="w-full max-w-4xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2 pr-3">Name</th>
            <th className="pb-2 pr-3">Email</th>
            <th className="pb-2 pr-3">Phone</th>
            <th className="pb-2 pr-3">Role</th>
            <th className="pb-2">Certifications</th>
          </tr>
        </thead>
        <tbody>
          {(users as Profile[] | null)?.map((u) => (
            <tr key={u.id} className="border-t border-gray-100">
              <td className="py-2 pr-3">
                <Link href={`/admin/users/${u.id}`} className="font-medium text-brand hover:underline">
                  {u.name}
                </Link>
              </td>
              <td className="py-2 pr-3 text-gray-500">{u.email}</td>
              <td className="py-2 pr-3 text-gray-500">{u.phone ?? "—"}</td>
              <td className="py-2 pr-3">
                <RoleSelect user={u} />
              </td>
              <td className="py-2">
                <div className="flex flex-wrap gap-1.5">
                  {activeTypes.map((type) => {
                    const cert = certsByUserId.get(u.id)?.get(type.id);
                    const status = certificationStatus(cert);
                    return (
                      <span
                        key={type.id}
                        title={type.name}
                        className={
                          status === "green"
                            ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                            : "rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
                        }
                      >
                        {type.name}
                      </span>
                    );
                  })}
                  {!activeTypes.length && <span className="text-xs text-gray-400">—</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

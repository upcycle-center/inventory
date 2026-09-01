import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { CertificationsInput } from "./CertificationsInput";
import { InviteUserForm } from "./InviteUserForm";
import { RoleSelect } from "./RoleSelect";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase.from("profiles").select("*").order("name");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Users" }]} />
      <h1 className="mb-6 text-lg font-semibold">Users</h1>

      <div className="mb-8">
        <InviteUserForm />
      </div>

      <table className="w-full max-w-4xl text-left text-sm">
        <thead className="text-gray-500">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Email</th>
            <th className="pb-2">Role</th>
            <th className="pb-2">Certifications</th>
          </tr>
        </thead>
        <tbody>
          {(users as Profile[] | null)?.map((u) => (
            <tr key={u.id} className="border-t border-gray-100">
              <td className="py-2">{u.name}</td>
              <td className="py-2 text-gray-500">{u.email}</td>
              <td className="py-2">
                <RoleSelect user={u} />
              </td>
              <td className="py-2">
                <CertificationsInput user={u} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

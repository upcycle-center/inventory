import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { InviteUserForm } from "./InviteUserForm";
import { RoleSelect } from "./RoleSelect";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase.from("profiles").select("*").eq("active", true).order("name");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Users" }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        <Link href="/admin/users/inactive" className="text-sm text-brand hover:underline">
          View inactive
        </Link>
      </div>

      <div className="mb-8">
        <InviteUserForm />
      </div>

      <div className="w-fit overflow-x-auto">
        <table className="text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="whitespace-nowrap pb-2 pr-6">Name</th>
              <th className="whitespace-nowrap pb-2 pr-6">Username</th>
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
                <td className="whitespace-nowrap py-2 pr-6 font-mono text-gray-500">{u.username}</td>
                <td className="whitespace-nowrap py-2 pr-6 text-gray-500">{u.notification_email ?? "—"}</td>
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

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/ActionForm";
import { toggleUserActive } from "../actions";
import type { Profile } from "@/lib/supabase/types";

export default async function InactiveUsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("active", false)
    .order("name");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: "Inactive" },
        ]}
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inactive users</h1>
        <Link href="/admin/users" className="text-sm text-brand hover:underline">
          Back to users
        </Link>
      </div>

      <div className="w-fit overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-2">Name</th>
              <th className="whitespace-nowrap px-4 py-2">Email</th>
              <th className="whitespace-nowrap px-4 py-2">Role</th>
              <th className="whitespace-nowrap px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(users as Profile[] | null)?.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-4 py-2">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-brand hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-500">{u.notification_email ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-500">{u.role}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <ActionForm action={toggleUserActive} className="contents" savedLabel="Reactivated">
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="active" value="false" />
                    <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">
                      Reactivate
                    </button>
                  </ActionForm>
                </td>
              </tr>
            ))}
            {!users?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No inactive users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

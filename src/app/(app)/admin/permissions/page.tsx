import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ActionForm } from "@/components/ActionForm";
import { VIEW_KEYS, ROLES_IN_MATRIX } from "@/lib/permissions";
import { updateRolePermissions } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  warehouse: "Warehouse",
  kitchen: "Kitchen",
  catering: "Catering",
  ops: "Ops",
  stand_lead: "Stand Lead",
};

export default async function AdminPermissionsPage() {
  await requireProfile(["admin"]);
  const supabase = createClient();

  const { data: rows } = await supabase.from("role_view_permissions").select("role, view_key, allowed");
  const allowedSet = new Set(
    ((rows as { role: string; view_key: string; allowed: boolean }[] | null) ?? [])
      .filter((r) => r.allowed)
      .map((r) => `${r.role}:${r.view_key}`)
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Permissions" }]} />
      <h1 className="mb-2 text-lg font-semibold">Permissions</h1>
      <p className="mb-6 text-sm text-gray-500">
        Which pages each role can reach — unchecking a box here blocks that page for the role (and
        hides its link from the top nav) on their very next request. Admin always has full access,
        so it isn&apos;t shown here.
      </p>

      <ActionForm
        action={updateRolePermissions}
        savedLabel="Permissions saved"
        className="overflow-x-auto rounded-md border border-gray-200 bg-white p-4"
      >
        <table className="w-full text-left text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="pb-2 pr-4">View</th>
              {ROLES_IN_MATRIX.map((role) => (
                <th key={role} className="px-3 pb-2 text-center">
                  {ROLE_LABEL[role] ?? role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VIEW_KEYS.map((v) => (
              <tr key={v.key} className="border-t border-gray-100">
                <td className="py-2 pr-4 font-medium">{v.label}</td>
                {ROLES_IN_MATRIX.map((role) => (
                  <td key={role} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      name={`allowed_${role}_${v.key}`}
                      defaultChecked={allowedSet.has(`${role}:${v.key}`)}
                      className="h-4 w-4"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button type="submit" className="mt-4 rounded-md bg-brand px-4 py-2 text-sm text-white">
          Save
        </button>
      </ActionForm>
    </div>
  );
}

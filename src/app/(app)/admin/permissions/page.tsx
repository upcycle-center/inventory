import { Fragment } from "react";
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

  // VIEW_KEYS lists ungrouped action pages first, then each admin
  // section's pages consecutively -- bucket by run of matching `group`
  // so the table can show a header row per section, matching the admin
  // left nav's own grouping.
  const sections: { label: string | null; items: typeof VIEW_KEYS[number][] }[] = [];
  for (const v of VIEW_KEYS) {
    const last = sections[sections.length - 1];
    if (last && last.label === v.group) last.items.push(v);
    else sections.push({ label: v.group, items: [v] });
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Permissions" }]} />
      <h1 className="mb-2 text-lg font-semibold">Permissions</h1>
      <p className="mb-6 text-sm text-gray-500">
        Which pages each role can reach — unchecking a box here blocks that page for the role (and
        hides its link from the nav) on their very next request. Admin always has full access, so it
        isn&apos;t shown here. For the grouped admin sections below (Catalog, Operations, etc.), a
        checked role gets view-only access — only Admin can add, edit, delete, or duplicate records.
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
            {sections.map((section, i) => (
              <Fragment key={section.label ?? `ungrouped-${i}`}>
                {section.label && (
                  <tr key={`${section.label}-header`} className="border-t border-gray-200">
                    <td colSpan={ROLES_IN_MATRIX.length + 1} className="bg-gray-50 py-1 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {section.label}
                    </td>
                  </tr>
                )}
                {section.items.map((v) => (
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
              </Fragment>
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

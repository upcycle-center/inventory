import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CertificationType } from "@/lib/supabase/types";
import { USER_ROLE_OPTIONS, ROSTER_ROLE_OPTIONS } from "@/lib/certificationRoles";
import { toggleCertificationTypeActive, updateCertificationType } from "../../actions";
import { DeleteCertificationTypeButton } from "./DeleteCertificationTypeButton";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function CertificationTypeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: typeRaw } = await supabase.from("certification_types").select("*").eq("id", params.id).single();
  const certType = typeRaw as CertificationType | null;

  if (!certType) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Roster", href: "/admin/roster" },
          { label: certType.name },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">Edit certification type</h1>

      <ActionForm
        id="edit-cert-type-form"
        action={updateCertificationType}
        className="grid max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={certType.id} />
        <label className="text-sm text-gray-600">
          Name
          <input name="name" defaultValue={certType.name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Description
          <textarea
            name="description"
            defaultValue={certType.description ?? ""}
            placeholder="What this certification is for"
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div>
          <p className="mb-1 text-sm font-medium">Applies to</p>
          <p className="mb-2 text-xs text-gray-500">Check the roles that require this certification (none checked = everyone).</p>
          <p className="mb-1 text-xs font-medium text-gray-400">Roster roles</p>
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
            {ROSTER_ROLE_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  name="applicable_roles"
                  value={r.value}
                  defaultChecked={certType.applicable_roles?.includes(r.value)}
                  className="h-3.5 w-3.5"
                />
                {r.label}
              </label>
            ))}
          </div>
          <p className="mb-1 text-xs font-medium text-gray-400">User roles</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {USER_ROLE_OPTIONS.map((r) => (
              <label key={r.value} className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  name="applicable_roles"
                  value={r.value}
                  defaultChecked={certType.applicable_roles?.includes(r.value)}
                  className="h-3.5 w-3.5"
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          form="edit-cert-type-form"
          className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Save
        </button>
        <ActionForm action={toggleCertificationTypeActive} className="contents" savedLabel={certType.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={certType.id} />
          <input type="hidden" name="active" value={String(certType.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {certType.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <DeleteCertificationTypeButton certificationTypeId={certType.id} />
      </div>
    </div>
  );
}

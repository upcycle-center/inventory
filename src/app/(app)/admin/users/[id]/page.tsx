import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CertificationType, UserCertification } from "@/lib/supabase/types";
import { certificationStatus } from "@/lib/certifications";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { updateUserProfile, setUserCertification } from "./actions";
import { toggleUserActive } from "../actions";
import { DeleteUserButton } from "./DeleteUserButton";

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: user }, { data: certTypes }, { data: userCerts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).single(),
    supabase.from("certification_types").select("*").eq("active", true).order("sort_order"),
    supabase.from("user_certifications").select("*").eq("user_id", params.id),
  ]);

  if (!user) notFound();

  const types = ((certTypes as CertificationType[] | null) ?? []).filter(
    (t) => !t.applicable_roles?.length || t.applicable_roles.includes(user.role)
  );
  const certByTypeId = new Map(
    ((userCerts as UserCertification[] | null) ?? []).map((c) => [c.certification_type_id, c])
  );

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: user.name },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">{user.name}</h1>

      {!user.active && (
        <div className="mb-4 max-w-md rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          This user is deactivated and can&apos;t log in.
        </div>
      )}

      <ActionForm
        id="edit-profile-form"
        action={updateUserProfile}
        savedLabel="Profile saved"
        className="grid max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={user.id} />
        <p className="text-sm font-medium">Profile</p>
        <label className="text-sm text-gray-600">
          Name
          <input name="name" defaultValue={user.name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Email
          <input value={user.email} disabled className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
        </label>
        <label className="text-sm text-gray-600">
          Contact number
          <input name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="e.g. (555) 123-4567" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          Role
          <select name="role" defaultValue={user.role} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="stand_lead">Stand Lead</option>
            <option value="warehouse">Warehouse</option>
            <option value="kitchen">Kitchen</option>
            <option value="catering">Catering</option>
            <option value="ops">Operations</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="receives_low_stock_report"
            defaultChecked={user.receives_low_stock_report}
            className="h-4 w-4"
          />
          Receives daily low-stock report email
        </label>
        <label className="text-sm text-gray-600">
          Report email (optional)
          <input
            name="low_stock_report_email"
            type="email"
            defaultValue={user.low_stock_report_email ?? ""}
            placeholder={user.email}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-gray-400">Leave blank to use the login email above.</span>
        </label>
      </ActionForm>

      <div className="mb-8 mt-3 flex items-center gap-3">
        <button type="submit" form="edit-profile-form" className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Save
        </button>
        <ActionForm action={toggleUserActive} className="contents" savedLabel={user.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="active" value={String(user.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {user.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <DeleteUserButton userId={user.id} />
      </div>

      <p className="mb-3 text-sm font-medium">Certifications</p>
      <p className="mb-3 text-sm text-gray-500">
        Only certifications relevant to this user&apos;s role are shown. Check a certification,
        set when it was earned and when it expires — the dot turns orange if it isn&apos;t on
        record or has expired.
      </p>

      <div className="max-w-2xl space-y-3">
        {types.map((type) => {
          const cert = certByTypeId.get(type.id);
          const status = certificationStatus(cert);
          return (
            <ActionForm
              key={type.id}
              action={setUserCertification}
              savedLabel="Saved"
              className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
            >
              <input type="hidden" name="user_id" value={user.id} />
              <input type="hidden" name="certification_type_id" value={type.id} />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="active" defaultChecked={!!cert} className="h-4 w-4" />
                {type.name}
                <span
                  className={
                    status === "green"
                      ? "h-2.5 w-2.5 rounded-full bg-green-500"
                      : "h-2.5 w-2.5 rounded-full bg-orange-500"
                  }
                  title={status === "green" ? "Valid" : "No record or expired"}
                />
              </label>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Certified on</label>
                <input name="certified_at" type="date" defaultValue={cert?.certified_at ?? ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Expires on</label>
                <input name="expires_at" type="date" defaultValue={cert?.expires_at ?? ""} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">
                Save
              </button>
            </ActionForm>
          );
        })}
        {!types.length && (
          <p className="text-sm text-gray-400">
            {certTypes?.length
              ? "No certification types apply to this role."
              : "No certification types set up yet. Add one under Admin → Users."}
          </p>
        )}
      </div>
    </div>
  );
}

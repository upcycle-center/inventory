import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/supabase/types";
import { STAFF_MAIN_ROLE_OPTIONS, requiredCertificationLabel } from "@/lib/staff";
import { toggleStaffActive, updateStaff } from "../actions";
import { DeleteStaffButton } from "./DeleteStaffButton";
import { ActionForm } from "@/components/ActionForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: staffRaw } = await supabase.from("staff").select("*").eq("id", params.id).single();
  const staffMember = staffRaw as Staff | null;

  if (!staffMember) notFound();

  const requiredCert = requiredCertificationLabel(staffMember.main_role) ?? requiredCertificationLabel(staffMember.cover_role);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Staff", href: "/admin/staff" },
          { label: `${staffMember.first_name} ${staffMember.last_name}` },
        ]}
      />
      <h1 className="mb-6 text-lg font-semibold">Edit staff</h1>

      <ActionForm
        id="edit-staff-form"
        action={updateStaff}
        className="grid max-w-md gap-3 rounded-md border border-gray-200 bg-white p-4"
      >
        <input type="hidden" name="id" value={staffMember.id} />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            First name
            <input name="first_name" defaultValue={staffMember.first_name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Last name
            <input name="last_name" defaultValue={staffMember.last_name} required className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Main role
            <select name="main_role" defaultValue={staffMember.main_role ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— None —</option>
              {STAFF_MAIN_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Cover role
            <select name="cover_role" defaultValue={staffMember.cover_role ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— None —</option>
              {STAFF_MAIN_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Phone
            <input name="phone" defaultValue={staffMember.phone ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-gray-600">
            Email
            <input name="email" type="email" defaultValue={staffMember.email ?? ""} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </label>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Certification</p>
          <p className="mb-3 text-sm text-gray-500">
            {requiredCert
              ? `Their Main/Cover role requires ${requiredCert} certification.`
              : "Their current role doesn't require a specific certification."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" name="certified" defaultChecked={staffMember.certified} className="h-4 w-4" />
              Certified{requiredCert ? ` (${requiredCert})` : ""}
            </label>
            <label className="text-sm text-gray-600">
              Expiration date
              <input
                name="certification_expires_at"
                type="date"
                defaultValue={staffMember.certification_expires_at ?? ""}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" name="ready_to_work" defaultChecked={staffMember.ready_to_work} className="h-4 w-4" />
          Ready to work
        </label>
      </ActionForm>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          form="edit-staff-form"
          className="w-fit rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Save
        </button>
        <ActionForm action={toggleStaffActive} className="contents" savedLabel={staffMember.active ? "Deactivated" : "Reactivated"}>
          <input type="hidden" name="id" value={staffMember.id} />
          <input type="hidden" name="active" value={String(staffMember.active)} />
          <button type="submit" className="w-fit rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            {staffMember.active ? "Deactivate" : "Reactivate"}
          </button>
        </ActionForm>
        <Link
          href={`/admin/month-end-reports/call-outs?staff=${staffMember.id}`}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          View log
        </Link>
        <DeleteStaffButton staffId={staffMember.id} />
      </div>
    </div>
  );
}

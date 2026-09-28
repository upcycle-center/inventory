import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { CertificationType, Profile, UserCertification } from "@/lib/supabase/types";
import { InviteUserForm } from "./InviteUserForm";
import { RoleSelect } from "./RoleSelect";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { OnboardingStatusBadge } from "@/components/OnboardingStatusBadge";
import { applicableCertificationTypesForRole, roleTracksOnboarding, userOnboardingReasons } from "@/lib/userOnboarding";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const [{ data: users }, { data: certTypesRaw }, { data: userCertsRaw }] = await Promise.all([
    supabase.from("profiles").select("*").eq("active", true).order("last_name").order("first_name"),
    supabase.from("certification_types").select("*").eq("active", true).order("sort_order"),
    supabase.from("user_certifications").select("*"),
  ]);

  const certTypes = (certTypesRaw as CertificationType[] | null) ?? [];
  const certsByUserId = new Map<string, Map<string, UserCertification>>();
  for (const c of (userCertsRaw as UserCertification[] | null) ?? []) {
    const byType = certsByUserId.get(c.user_id) ?? new Map<string, UserCertification>();
    byType.set(c.certification_type_id, c);
    certsByUserId.set(c.user_id, byType);
  }

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
              <th className="whitespace-nowrap pb-2 pr-6">First Name</th>
              <th className="whitespace-nowrap pb-2 pr-6">Last Name</th>
              <th className="whitespace-nowrap pb-2 pr-6">Username</th>
              <th className="whitespace-nowrap pb-2 pr-6">Email</th>
              <th className="whitespace-nowrap pb-2 pr-6">Phone</th>
              <th className="whitespace-nowrap pb-2 pr-6">Role</th>
              <th className="whitespace-nowrap pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(users as Profile[] | null)?.map((u) => {
              const tracksOnboarding = roleTracksOnboarding(u.role);
              const applicableTypes = tracksOnboarding ? applicableCertificationTypesForRole(u.role, certTypes) : [];
              const { reasons, hasStartedCertification } = tracksOnboarding
                ? userOnboardingReasons(certsByUserId.get(u.id) ?? new Map(), applicableTypes, u.ready_to_work)
                : { reasons: [], hasStartedCertification: false };
              return (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="whitespace-nowrap py-2 pr-6">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-brand hover:underline">
                      {u.first_name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-6">{u.last_name}</td>
                  <td className="whitespace-nowrap py-2 pr-6 font-mono text-gray-500">{u.username}</td>
                  <td className="whitespace-nowrap py-2 pr-6 text-gray-500">{u.notification_email ?? "—"}</td>
                  <td className="whitespace-nowrap py-2 pr-6 text-gray-500">{u.phone ?? "—"}</td>
                  <td className="whitespace-nowrap py-2 pr-6">
                    <RoleSelect user={u} />
                  </td>
                  <td className="whitespace-nowrap py-2">
                    {tracksOnboarding ? (
                      <OnboardingStatusBadge active={u.active} reasons={reasons} hasStartedCertification={hasStartedCertification} />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

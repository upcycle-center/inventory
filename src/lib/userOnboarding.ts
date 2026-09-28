import type { CertificationType, UserCertification, UserRole } from "./supabase/types";
import { isCertificationExpired } from "./staff";

// Admin and Ops skip the onboarding pipeline entirely -- no certification
// tracking, no ready-to-work gate, no Status badge, and excluded from the
// annual season reset.
export function roleTracksOnboarding(role: UserRole): boolean {
  return role !== "admin" && role !== "ops";
}

// Same "applies to everyone if unrestricted" rule as the per-user
// Certifications section on the Users edit page.
export function applicableCertificationTypesForRole(role: UserRole, certTypes: CertificationType[]): CertificationType[] {
  return certTypes.filter((t) => !t.applicable_roles?.length || t.applicable_roles.includes(role));
}

// A user can have more than one applicable certification at once (unlike
// Roster's single governing type) -- Orientation is reserved for having
// never completed ANY of them; an expired one (or one still pending)
// keeps them at "Certification" instead of regressing all the way back.
export function userOnboardingReasons(
  certsByTypeId: Map<string, UserCertification>,
  applicableTypes: CertificationType[],
  readyToWork: boolean
): { reasons: string[]; hasStartedCertification: boolean } {
  const reasons: string[] = [];
  let everCertified = false;
  for (const type of applicableTypes) {
    const cert = certsByTypeId.get(type.id);
    if (cert) everCertified = true;
    const expired = cert ? isCertificationExpired(cert.expires_at) : false;
    if (!cert || expired) {
      reasons.push(expired ? `${type.name} expired` : `Missing ${type.name}`);
    }
  }
  if (!readyToWork) reasons.push("Not marked ready to work");
  return { reasons, hasStartedCertification: everCertified || !applicableTypes.length };
}

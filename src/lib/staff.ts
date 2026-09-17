import type { CertificationType } from "./supabase/types";
import { STAFF_ROLES } from "./staffRoles";

// Main Role / Cover Role draw from the same canonical role vocabulary
// used everywhere else (WFM Shifts, Call-Out logging), plus Stand Lead
// since a staff member can hold that role too.
export const STAFF_MAIN_ROLE_OPTIONS = ["Stand Lead", ...STAFF_ROLES];

// Which certification(s) a roster member needs is driven by the shared
// certification_types catalog (managed on this same Roster page) rather
// than a fixed map -- a type "applies" to a roster member when its
// applicable_roles includes their Main or Cover role. Informational only
// -- surfaced as a warning when missing/expired, not enforced as a hard
// block.
export function requiredCertificationNames(
  staffMember: { main_role: string | null; cover_role: string | null },
  certTypes: CertificationType[]
): string[] {
  const roles = [staffMember.main_role, staffMember.cover_role].filter((r): r is string => !!r);
  if (!roles.length) return [];
  return certTypes.filter((t) => t.applicable_roles?.some((r) => roles.includes(r))).map((t) => t.name);
}

export function isCertificationExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function staffFullName(s: { first_name: string; last_name: string }): string {
  return `${s.first_name} ${s.last_name}`.trim();
}

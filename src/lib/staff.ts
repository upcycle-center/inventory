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
export function matchingCertificationTypes(
  staffMember: { main_role: string | null; cover_role: string | null },
  certTypes: CertificationType[]
): CertificationType[] {
  const roles = [staffMember.main_role, staffMember.cover_role].filter((r): r is string => !!r);
  if (!roles.length) return [];
  return certTypes.filter((t) => t.applicable_roles?.some((r) => roles.includes(r)));
}

export function requiredCertificationNames(
  staffMember: { main_role: string | null; cover_role: string | null },
  certTypes: CertificationType[]
): string[] {
  return matchingCertificationTypes(staffMember, certTypes).map((t) => t.name);
}

// The certification type whose duration governs the auto-calculated
// expiration date -- the first matching type with a validity_months set,
// falling back to the first match (still shown/tracked, just without an
// auto-calculated expiration).
export function governingCertificationType(
  staffMember: { main_role: string | null; cover_role: string | null },
  certTypes: CertificationType[]
): CertificationType | null {
  const matches = matchingCertificationTypes(staffMember, certTypes);
  return matches.find((t) => t.validity_months != null) ?? matches[0] ?? null;
}

export function formatValidityMonths(months: number): string {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} month${months === 1 ? "" : "s"}`;
}

export function addMonthsToDateString(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function isCertificationExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function staffFullName(s: { first_name: string; last_name: string }): string {
  return `${s.first_name} ${s.last_name}`.trim();
}

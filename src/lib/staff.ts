import { STAFF_ROLES } from "./staffRoles";

// Main Role / Cover Role draw from the same canonical role vocabulary
// used everywhere else (WFM Shifts, Call-Out logging), plus Stand Lead
// since a staff member can hold that role too.
export const STAFF_MAIN_ROLE_OPTIONS = ["Stand Lead", ...STAFF_ROLES];

// Bartender requires T.E.A.M certification (alcohol service); Server
// Food requires ServeSafe. Informational only -- surfaced as a warning
// when missing/expired, not currently enforced as a hard block.
const REQUIRED_CERTIFICATION_BY_ROLE: Record<string, string> = {
  Bartender: "T.E.A.M",
  "Server Food": "ServeSafe",
};

export function requiredCertificationLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  return REQUIRED_CERTIFICATION_BY_ROLE[role] ?? null;
}

export function isCertificationExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function staffFullName(s: { first_name: string; last_name: string }): string {
  return `${s.first_name} ${s.last_name}`.trim();
}

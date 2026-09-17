import type { UserRole } from "./supabase/types";
import { STAFF_MAIN_ROLE_OPTIONS } from "./staff";

// The certification_types catalog is shared between real login Users
// (system UserRole values) and Roster members (STAFF_MAIN_ROLE_OPTIONS
// values) -- the two vocabularies never collide, so both can be offered
// as "Applies to" checkboxes on the same certification type.
export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "stand_lead", label: "Stand Lead" },
  { value: "warehouse", label: "Warehouse" },
  { value: "kitchen", label: "Kitchen" },
  { value: "catering", label: "Catering" },
  { value: "ops", label: "Operations" },
  { value: "admin", label: "Admin" },
];

export const ROSTER_ROLE_OPTIONS = STAFF_MAIN_ROLE_OPTIONS.map((r) => ({ value: r, label: r }));

export const ROLE_LABEL_BY_VALUE = new Map([...USER_ROLE_OPTIONS, ...ROSTER_ROLE_OPTIONS].map((r) => [r.value, r.label]));

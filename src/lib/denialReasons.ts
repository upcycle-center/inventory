// Shared with both the server actions and the page -- can't live in a
// "use server" file since those may only export async functions.
export const DENIAL_REASONS = [
  { code: "OOS", label: "Out of Stock" },
  { code: "RSV", label: "Reserved" },
  { code: "OTH", label: "Other" },
] as const;

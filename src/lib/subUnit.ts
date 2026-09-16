// The only two allowed Sub-Unit values -- a fixed list, not free text, so
// downstream displays/reports can reliably abbreviate and compare them.
export const SUB_UNIT_OPTIONS = [
  { value: "Pack", label: "Pack (PK)", abbrev: "PK" },
  { value: "Sleeve", label: "Sleeve (SL)", abbrev: "SL" },
];

export function subUnitAbbrev(label: string | null | undefined): string {
  if (!label) return "";
  return SUB_UNIT_OPTIONS.find((o) => o.value === label)?.abbrev ?? label;
}

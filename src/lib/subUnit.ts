// Products with a packaging tier between Case and Each all use the same
// uniform unit -- "Count" -- rather than picking a container name (Pack,
// Sleeve, ...) per product. Matches the EA/CS abbreviation style used
// elsewhere (Each, Case, Count).
export const SUB_UNIT_LABEL = "Count";
export const SUB_UNIT_ABBREV = "CT";

export function subUnitAbbrev(label: string | null | undefined): string {
  return label ? SUB_UNIT_ABBREV : "";
}

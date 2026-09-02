// unit_cost is the cost per the product's own unit_of_measure (each or
// case) — this derives cost-per-each and cost-per-case so a location's
// on-hand (which can mix EA/CS counts) can be valued consistently.
export function unitCosts(product: { unit_cost: number | null; unit_of_measure: string; case_size: number | null }) {
  const cost = Number(product.unit_cost ?? 0);
  const caseSize = product.case_size ? Number(product.case_size) : null;
  if (product.unit_of_measure === "case") {
    return { perEach: caseSize ? cost / caseSize : 0, perCase: cost };
  }
  return { perEach: cost, perCase: caseSize ? cost * caseSize : 0 };
}

export function lineValue(
  qtyEach: number | null | undefined,
  qtyCases: number | null | undefined,
  product: { unit_cost: number | null; unit_of_measure: string; case_size: number | null }
): number {
  const { perEach, perCase } = unitCosts(product);
  return (qtyEach ?? 0) * perEach + (qtyCases ?? 0) * perCase;
}

// Cost is always entered per CASE; per-EACH cost is always derived from
// the product's case_size — no branching on unit_of_measure.
export function unitCosts(product: { case_cost: number | null; case_size: number | null }) {
  const perCase = Number(product.case_cost ?? 0);
  const caseSize = product.case_size ? Number(product.case_size) : null;
  return { perEach: caseSize ? perCase / caseSize : 0, perCase };
}

export function lineValue(
  qtyEach: number | null | undefined,
  qtyCases: number | null | undefined,
  product: { case_cost: number | null; case_size: number | null }
): number {
  const { perEach, perCase } = unitCosts(product);
  return (qtyEach ?? 0) * perEach + (qtyCases ?? 0) * perCase;
}

// sale_price is per EACH (the retail unit) — case retail value scales up
// by case_size.
export function retailUnitPrices(product: { sale_price: number | null; case_size: number | null }) {
  const perEach = Number(product.sale_price ?? 0);
  const caseSize = product.case_size ? Number(product.case_size) : null;
  return { perEach, perCase: caseSize ? perEach * caseSize : 0 };
}

export function lineRetailValue(
  qtyEach: number | null | undefined,
  qtyCases: number | null | undefined,
  product: { sale_price: number | null; case_size: number | null }
): number {
  const { perEach, perCase } = retailUnitPrices(product);
  return (qtyEach ?? 0) * perEach + (qtyCases ?? 0) * perCase;
}

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

// Site-wide spillage/waste allowance applied to pours-per-bottle in the
// pour-based retail projection below. A single constant for now (per the
// call to keep this simple to ship) -- move to a per-product or admin-
// editable setting later if it needs to vary.
export const POUR_WASTE_PCT = 0.1;

type PourProduct = {
  sale_price: number | null;
  case_size: number | null;
  bottle_size_oz?: number | null;
  pour_size_oz?: number | null;
  pour_price?: number | null;
};
type PourCategory = { is_pour_based: boolean } | null | undefined;

// sale_price is per EACH (the retail unit) — case retail value scales up
// by case_size. For a pour-based category (liquor, wine) with pour details
// on file, the bottle isn't sold whole: its retail value is instead
// projected as (pours per bottle, minus a waste allowance) x price per
// pour, falling back to sale_price if any pour field is missing.
export function retailUnitPrices(product: PourProduct, category?: PourCategory) {
  const caseSize = product.case_size ? Number(product.case_size) : null;

  if (category?.is_pour_based && product.bottle_size_oz && product.pour_size_oz && product.pour_price) {
    const poursPerBottle = Math.floor((product.bottle_size_oz / product.pour_size_oz) * (1 - POUR_WASTE_PCT));
    const perEach = poursPerBottle * product.pour_price;
    return { perEach, perCase: caseSize ? perEach * caseSize : 0 };
  }

  const perEach = Number(product.sale_price ?? 0);
  return { perEach, perCase: caseSize ? perEach * caseSize : 0 };
}

export function lineRetailValue(
  qtyEach: number | null | undefined,
  qtyCases: number | null | undefined,
  product: PourProduct,
  category?: PourCategory
): number {
  const { perEach, perCase } = retailUnitPrices(product, category);
  return (qtyEach ?? 0) * perEach + (qtyCases ?? 0) * perCase;
}

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

// Bottle size is entered in mL (how liquor is actually sold — 1L, 750ml,
// 375ml), but a pour is conventionally specified in oz — convert before
// dividing.
const ML_PER_OZ = 29.5735;

type PourProduct = {
  product_type: string;
  sale_price: number | null;
  case_size: number | null;
  bottle_size_ml?: number | null;
  pour_size_oz?: number | null;
  pour_price?: number | null;
};

// Retail valuation depends entirely on the product's own Type:
// - chargeable: sale_price per EACH, case value scales up by case_size
//   (the historical, only behavior before Type grew pour/mixer variants)
// - non_chargeable_bottle: poured rather than sold whole (liquor/wine) --
//   projected as (pours per bottle, minus a waste allowance) x price per
//   pour, falling back to sale_price if any pour field is missing
// - non_chargeable_mixer / disposable: cocktail ingredients and supplies,
//   never billed on their own -- no retail value
export function retailUnitPrices(product: PourProduct) {
  const caseSize = product.case_size ? Number(product.case_size) : null;

  if (product.product_type === "non_chargeable_mixer" || product.product_type === "disposable") {
    return { perEach: 0, perCase: 0 };
  }

  if (product.product_type === "non_chargeable_bottle" && product.bottle_size_ml && product.pour_size_oz && product.pour_price) {
    const bottleSizeOz = product.bottle_size_ml / ML_PER_OZ;
    const poursPerBottle = Math.floor((bottleSizeOz / product.pour_size_oz) * (1 - POUR_WASTE_PCT));
    const perEach = poursPerBottle * product.pour_price;
    return { perEach, perCase: caseSize ? perEach * caseSize : 0 };
  }

  const perEach = Number(product.sale_price ?? 0);
  return { perEach, perCase: caseSize ? perEach * caseSize : 0 };
}

export function lineRetailValue(
  qtyEach: number | null | undefined,
  qtyCases: number | null | undefined,
  product: PourProduct
): number {
  const { perEach, perCase } = retailUnitPrices(product);
  return (qtyEach ?? 0) * perEach + (qtyCases ?? 0) * perCase;
}

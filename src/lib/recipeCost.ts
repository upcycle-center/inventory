import type { RecipeRequestSize } from "@/lib/supabase/types";

const ML_PER_OZ = 29.5735;
const FL_OZ_PER_GAL = 128;

// 20% pour cost -- the standard target for a NY concert-venue bar
// program -- so recommended MSRP = cost / 0.20 (cost x 5).
export const POUR_COST_TARGET = 0.2;

// Cost per fluid ounce for a product, derived from its case economics --
// the same bottle-size math TOT Retail already uses for pour-based
// products. Returns null when the product is missing the fields needed
// to compute it (e.g. not sold/costed by the bottle).
export function costPerOz(product: {
  case_cost: number | null;
  case_size: number | null;
  bottle_size_ml: number | null;
}): number | null {
  if (!product.case_cost || !product.case_size || !product.bottle_size_ml) return null;
  const costPerBottle = product.case_cost / product.case_size;
  const bottleSizeOz = product.bottle_size_ml / ML_PER_OZ;
  if (!bottleSizeOz) return null;
  return costPerBottle / bottleSizeOz;
}

export type RecipeSizeKey = RecipeRequestSize;

// Scale factor relative to the base (single-serving) recipe's total oz --
// 1x for Single, 2x for Double, and volume-ratio scaled for the two
// batch sizes so the batch comes out to exactly that target volume.
export const RECIPE_SIZE_DEFS: { key: RecipeSizeKey; label: string; scale: (baseTotalOz: number) => number }[] = [
  { key: "single", label: "Single", scale: () => 1 },
  { key: "double", label: "Double", scale: () => 2 },
  { key: "liter", label: "1L Carafe", scale: (baseTotalOz) => (baseTotalOz > 0 ? 1000 / ML_PER_OZ / baseTotalOz : 0) },
  {
    key: "batch_2_5_gal",
    label: "2.5gal Bubbler",
    scale: (baseTotalOz) => (baseTotalOz > 0 ? (2.5 * FL_OZ_PER_GAL) / baseTotalOz : 0),
  },
];

export function recipeSizeLabel(key: RecipeSizeKey): string {
  return RECIPE_SIZE_DEFS.find((s) => s.key === key)?.label ?? key;
}

export interface RecipeIngredientLine {
  productId: string;
  description: string;
  quantityOz: number;
  costPerOz: number | null;
}

export interface RecipeSizeResult {
  key: RecipeSizeKey;
  label: string;
  totalOz: number;
  // Single-serving-equivalents this size represents -- 1 for Single, 2
  // for Double, ~N for a batch (how many single servings it yields).
  servings: number;
  cost: number | null;
  msrp: number | null;
}

// null cost/msrp means at least one ingredient is missing cost data
// (no case_cost/case_size/bottle_size_ml on record) -- the UI flags
// which ingredient rather than silently showing a wrong total.
export function computeRecipeSizes(ingredients: RecipeIngredientLine[]): RecipeSizeResult[] {
  const baseTotalOz = ingredients.reduce((sum, i) => sum + i.quantityOz, 0);
  const hasAllCosts = ingredients.length > 0 && ingredients.every((i) => i.costPerOz != null);

  return RECIPE_SIZE_DEFS.map(({ key, label, scale }) => {
    const servings = scale(baseTotalOz);
    const totalOz = baseTotalOz * servings;
    const cost = hasAllCosts ? ingredients.reduce((sum, i) => sum + i.quantityOz * servings * (i.costPerOz ?? 0), 0) : null;
    const msrp = cost != null ? cost / POUR_COST_TARGET : null;
    return { key, label, totalOz, servings, cost, msrp };
  });
}

// The scale factor for one specific size -- used by the Ops Sheet pick
// list and Recipe Request fulfillment, where only one size is needed
// rather than the whole comparison table.
export function scaleForSize(sizeKey: RecipeSizeKey, baseTotalOz: number): number {
  return RECIPE_SIZE_DEFS.find((s) => s.key === sizeKey)?.scale(baseTotalOz) ?? 0;
}

export interface ScaledIngredientLine {
  productId: string;
  description: string;
  quantityOz: number;
}

// Each ingredient's quantity scaled to one size, optionally multiplied by
// how many of that size were requested (requestQuantity) -- the actual
// pick list a Request line or Ops Sheet hands Warehouse.
export function scaledIngredients(
  ingredients: { productId: string; description: string; quantityOz: number }[],
  sizeKey: RecipeSizeKey,
  requestQuantity = 1
): ScaledIngredientLine[] {
  const baseTotalOz = ingredients.reduce((sum, i) => sum + i.quantityOz, 0);
  const scale = scaleForSize(sizeKey, baseTotalOz) * requestQuantity;
  return ingredients.map((i) => ({ productId: i.productId, description: i.description, quantityOz: i.quantityOz * scale }));
}

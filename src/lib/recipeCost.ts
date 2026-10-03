import type { RecipeRequestSize } from "@/lib/supabase/types";

const ML_PER_OZ = 29.5735;
const FL_OZ_PER_GAL = 128;

// Default target pour-cost % (20, i.e. 20%) -- the standard starting
// point for a NY concert-venue bar program -- editable per recipe from
// there (recipes.target_pour_cost_pct) to tweak margin.
export const DEFAULT_POUR_COST_PCT = 20;

// A Top Off ingredient (quantityOz null -- no measured amount) is costed
// at this standard amount, same as any other ingredient from there on
// (doubles for Double, scales normally for Carafe/Bubbler).
const TOP_OFF_DEFAULT_OZ = 2;

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

// Scale factor relative to the base recipe's total oz (every ingredient's
// quantity summed, with a Top Off ingredient standing in at 2oz) -- 1x
// for Wine/Single, 2x for Double, and volume-ratio scaled for the two
// batch sizes so the batch comes out to exactly that target volume. Wine
// and Single share the same 1x math -- the label is just which cup it's
// served in, not a different recipe amount.
export const RECIPE_SIZE_DEFS: { key: RecipeSizeKey; label: string; scale: (baseTotalOz: number) => number }[] = [
  { key: "wine", label: "9oz Wine", scale: () => 1 },
  { key: "single", label: "10oz Single", scale: () => 1 },
  { key: "double", label: "16oz Double", scale: () => 2 },
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
  // null = Top Off -- no measured amount, costed at a standard 2oz.
  quantityOz: number | null;
  // Optional for callers that only need the pick list, not cost (e.g.
  // Ops Sheet, RequestQ's pick-list display).
  costPerOz?: number | null;
}

export interface ResolvedIngredientLine {
  productId: string;
  description: string;
  quantityOz: number;
  isTopOff: boolean;
  costPerOz: number | null;
}

function baseQty(i: RecipeIngredientLine): number {
  return i.quantityOz ?? TOP_OFF_DEFAULT_OZ;
}

// Every ingredient resolved to its actual oz for one size.
export function resolveIngredientsForSize(ingredients: RecipeIngredientLine[], sizeKey: RecipeSizeKey): ResolvedIngredientLine[] {
  const baseTotalOz = ingredients.reduce((sum, i) => sum + baseQty(i), 0);
  const scale = RECIPE_SIZE_DEFS.find((s) => s.key === sizeKey)?.scale(baseTotalOz) ?? 0;
  return ingredients.map((i) => ({
    productId: i.productId,
    description: i.description,
    quantityOz: baseQty(i) * scale,
    isTopOff: i.quantityOz == null,
    costPerOz: i.costPerOz ?? null,
  }));
}

export interface RecipeSizeResult {
  key: RecipeSizeKey;
  label: string;
  totalOz: number;
  cost: number | null;
  msrp: number | null;
}

// null cost/msrp means at least one ingredient is missing cost data
// (no case_cost/case_size/bottle_size_ml on record) -- the UI flags
// which ingredient rather than silently showing a wrong total.
// pourCostPct is a percentage (20 means 20%), per-recipe editable.
export function computeRecipeSizes(ingredients: RecipeIngredientLine[], pourCostPct: number = DEFAULT_POUR_COST_PCT): RecipeSizeResult[] {
  const pourCostFraction = pourCostPct / 100;
  return RECIPE_SIZE_DEFS.map(({ key, label }) => {
    const lines = resolveIngredientsForSize(ingredients, key);
    const totalOz = lines.reduce((sum, l) => sum + l.quantityOz, 0);
    const hasAllCosts = lines.length > 0 && lines.every((l) => l.costPerOz != null);
    const cost = hasAllCosts ? lines.reduce((sum, l) => sum + l.quantityOz * (l.costPerOz ?? 0), 0) : null;
    const msrp = cost != null && pourCostFraction > 0 ? cost / pourCostFraction : null;
    return { key, label, totalOz, cost, msrp };
  });
}

export interface PickListLine {
  productId: string;
  description: string;
  quantityOz: number;
  isTopOff: boolean;
}

// The actual pick list for one size, optionally multiplied by how many of
// that size were requested (requestQuantity) -- used by the Ops Sheet and
// Recipe Request fulfillment/shortfall reporting.
export function pickListForSize(ingredients: RecipeIngredientLine[], sizeKey: RecipeSizeKey, requestQuantity = 1): PickListLine[] {
  return resolveIngredientsForSize(ingredients, sizeKey).map((l) => ({
    productId: l.productId,
    description: l.description,
    quantityOz: l.quantityOz * requestQuantity,
    isTopOff: l.isTopOff,
  }));
}

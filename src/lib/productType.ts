// Product Type drives both the Products list tabs and how TOT Retail
// values a product: Chargeable uses Retail Value; Non-Chargeable -- Bottles
// (liquor/wine, poured rather than sold whole) projects value off pours
// per bottle; Non-Chargeable -- Mixers (sour mix, soda water, tonic,
// juices -- cocktail ingredients, never billed on their own) and
// Disposables/Cleaning carry no retail value.
export const PRODUCT_TYPE_OPTIONS = [
  { value: "chargeable", label: "Chargeable (sold in single units)", shortLabel: "Chargeable" },
  { value: "non_chargeable_bottle", label: "Non-Chargeable – Bottles (sold in servings)", shortLabel: "Non-Chargeable – Bottles" },
  { value: "non_chargeable_mixer", label: "Non-Chargeable – Mixers", shortLabel: "Non-Chargeable – Mixers" },
  { value: "disposable", label: "Disposables/Cleaning", shortLabel: "Disposables/Cleaning" },
] as const;

export type ProductTypeValue = (typeof PRODUCT_TYPE_OPTIONS)[number]["value"];

const LABEL_BY_VALUE = new Map(PRODUCT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export function productTypeLabel(value: string): string {
  return LABEL_BY_VALUE.get(value as ProductTypeValue) ?? value;
}

export function isProductTypeValue(value: string): value is ProductTypeValue {
  return LABEL_BY_VALUE.has(value as ProductTypeValue);
}

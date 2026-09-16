import { subUnitAbbrev } from "@/lib/subUnit";

// Case size means "each per case" normally ("24/CS"), but once a product
// has a Sub-Unit (Sleeve, Pack), what's stored there is "Sub-Units per
// case" instead -- show both parts (case count/Sub-Unit count + its
// abbreviation, e.g. "20/50PK") with the real each-per-case as a hover
// tooltip, since "CS" on the first number would otherwise misread as the
// per-case each count.
export function CaseSizeLabel({
  product,
}: {
  product: { case_size: number | null; middle_unit_label: string | null; middle_unit_size: number | null };
}) {
  if (!product.case_size) return <>—</>;
  if (!product.middle_unit_label || !product.middle_unit_size) {
    return <>{product.case_size}/CS</>;
  }
  const totalEach = product.case_size * product.middle_unit_size;
  return (
    <span title={`${totalEach.toLocaleString()} each per case`}>
      {product.case_size}/{product.middle_unit_size}
      {subUnitAbbrev(product.middle_unit_label)}
    </span>
  );
}

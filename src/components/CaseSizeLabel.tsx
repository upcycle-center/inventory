// Case size means "each per case" normally ("24/CS"), but once a product
// has a middle unit (Sleeve, Pack), what's stored there is "middle units
// per case" instead -- show both parts so the case-to-middle-unit
// breakdown is visible, with the real each-per-case as a hover tooltip.
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
      {product.case_size}CS/{product.middle_unit_size}{product.middle_unit_label}
    </span>
  );
}

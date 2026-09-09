export function fmtCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

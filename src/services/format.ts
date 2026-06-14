/* ============================================================
   Currency & number formatting — ₹ with Indian digit grouping.
   ============================================================ */

/** ₹14,82,500.00 — Indian grouping, two decimals by default. */
export function formatINR(value: number, decimals = 2): string {
  return (
    '₹' +
    Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

/** ₹14,82,500 — Indian grouping, no decimals. */
export function formatINR0(value: number): string {
  return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** A signed amount with ₹ — e.g. "+₹2,080.00" / "−₹999.99". Uses a true minus sign. */
export function formatSignedINR(value: number, decimals = 2): string {
  const sign = value < 0 ? '−' : '+';
  return sign + formatINR(Math.abs(value), decimals);
}

/** Plain number with Indian grouping, no symbol. */
export function formatNumberIN(value: number, decimals = 0): string {
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Lakh shorthand for charts — 1482500 → "14.8L". */
export function lakh(value: number): string {
  return (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + 'L';
}

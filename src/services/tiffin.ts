/* ============================================================
   Tiffin / food allowance — company-paid CTC, never a deduction.
   No tiffin on paid-leave days. Half-day eligibility is configurable.
   ============================================================ */

import type { TiffinLabel } from '../types';

/** Sum of all configured tiffin labels for a full day. */
export function tiffinPerDay(labels: TiffinLabel[]): number {
  return labels.reduce((sum, t) => sum + t.amount, 0);
}

/** Total tiffin CTC payable = per-day rate × eligible tiffin days. */
export function tiffinTotal(labels: TiffinLabel[], tiffinDays: number): number {
  return tiffinPerDay(labels) * tiffinDays;
}

export interface TiffinDaysInput {
  daysPresent: number;
  daysHalf: number;
  /** When true, half-days earn 50% (counted as 0.5 tiffin day). */
  halfTiffinEligible: boolean;
}

/**
 * Eligible tiffin days from attendance. Present days count fully; half-days
 * count as 0.5 only when half-day tiffin is enabled. Paid-leave/off days earn
 * no tiffin and are therefore excluded.
 */
export function computeTiffinDays(input: TiffinDaysInput): number {
  const halfContribution = input.halfTiffinEligible ? input.daysHalf * 0.5 : 0;
  return input.daysPresent + halfContribution;
}

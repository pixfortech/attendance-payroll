/* ============================================================
   Advance repayment plans.

   An advance can be recovered from salary across months. We generate a
   schedule of monthly adjustments (amount + running balance) and expose
   helpers to read the adjustment / remaining balance for a given salary month.
   ============================================================ */

import type { Advance, AdvanceAdjustment } from '../types';
import { round2 } from './salary';

export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Ordinal for "Mon YYYY" so months can be compared/sorted. */
export function monthOrdinal(label: string): number {
  const [mon, yr] = label.split(' ');
  const idx = MONTH_ABBR.indexOf(mon);
  const year = Number.parseInt(yr, 10);
  return idx < 0 || Number.isNaN(year) ? 0 : year * 12 + idx;
}

/** Add `n` months to a "Mon YYYY" label. */
export function addMonths(label: string, n: number): string {
  const [mon, yr] = label.split(' ');
  const idx = MONTH_ABBR.indexOf(mon);
  const year = Number.parseInt(yr, 10);
  if (idx < 0 || Number.isNaN(year)) return label;
  const total = idx + n;
  return `${MONTH_ABBR[((total % 12) + 12) % 12]} ${year + Math.floor(total / 12)}`;
}

/** Build the month-by-month recovery schedule for an advance. */
export function buildAdvanceSchedule(amount: number, monthlyAmount: number, startMonth: string): AdvanceAdjustment[] {
  const out: AdvanceAdjustment[] = [];
  let balance = amount;
  const per = Math.max(1, monthlyAmount);
  for (let i = 0; balance > 0 && i < 120; i++) {
    const amt = Math.min(per, balance);
    balance = round2(balance - amt);
    out.push({ id: `sch-${i + 1}`, month: addMonths(startMonth, i), amount: round2(amt), balanceAfter: balance, done: false });
  }
  return out;
}

/** Total advance adjustment scheduled against a given salary month. */
export function advanceAdjustmentForMonth(advances: Advance[], month: string): number {
  let total = 0;
  for (const a of advances) {
    if (a.cleared || !a.schedule) continue;
    const entry = a.schedule.find((s) => s.month === month);
    if (entry) total += entry.amount;
  }
  return round2(total);
}

/** Remaining advance balance after recoveries up to and including `month`. */
export function advanceRemaining(advances: Advance[], month: string): number {
  const ord = monthOrdinal(month);
  let total = 0;
  for (const a of advances) {
    if (a.cleared) continue;
    if (!a.schedule || a.schedule.length === 0) {
      total += a.amount;
      continue;
    }
    const past = a.schedule.filter((s) => monthOrdinal(s.month) <= ord);
    total += past.length ? past[past.length - 1].balanceAfter : a.amount;
  }
  return round2(total);
}

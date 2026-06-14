/* ============================================================
   Paid-leave eligibility.

   An employee earns the 4 free/paid leave days per month only when ALL
   three conditions pass:
     1. tenure >= 3 months
     2. >= 15 worked days this month (exactly 15 counts)
     3. not resigned mid-month (status active)
   Otherwise every leave/absent day is deductible.
   ============================================================ */

import type { EmployeeStatus } from '../types';

export const MIN_TENURE_MONTHS = 3;
export const MIN_WORKED_DAYS = 15;
export const FREE_LEAVE_PER_MONTH = 4;

export interface EligibilityInput {
  tenureMonths: number;
  workedDays: number;
  status: EmployeeStatus;
}

export interface EligibilityCondition {
  label: string;
  passed: boolean;
  detail: string;
}

export interface EligibilityResult {
  eligible: boolean;
  conditions: EligibilityCondition[];
  /** 4 when eligible, otherwise 0. */
  freeLeaveAllowed: number;
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult {
  const tenureOk = input.tenureMonths >= MIN_TENURE_MONTHS;
  const workedOk = input.workedDays >= MIN_WORKED_DAYS; // exactly 15 counts
  const notResigned = input.status === 'active';
  const eligible = tenureOk && workedOk && notResigned;

  return {
    eligible,
    freeLeaveAllowed: eligible ? FREE_LEAVE_PER_MONTH : 0,
    conditions: [
      {
        label: `${MIN_TENURE_MONTHS} months in company`,
        passed: tenureOk,
        detail: `${input.tenureMonths} months`,
      },
      {
        label: `${MIN_WORKED_DAYS}+ worked days this month`,
        passed: workedOk,
        detail: `${input.workedDays} days worked`,
      },
      {
        label: 'Not resigned mid-month',
        passed: notResigned,
        detail: notResigned ? 'Active' : 'Resigned',
      },
    ],
  };
}

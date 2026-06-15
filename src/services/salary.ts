/* ============================================================
   Salary calculation.

   - Monthly salary per employee; basis is Fixed 30-day or actual calendar-day.
   - A new joiner's first month ALWAYS uses calendar-day logic.
   - 4 free/paid leaves per month for eligible employees; only days above 4
     are deducted. Not eligible => every leave/absent day is deductible.
   - Tiffin/food allowance is a CTC paid on top — never a deduction.
   ============================================================ */

import type { SalaryBasis, EmployeeStatus } from '../types';
import { evaluateEligibility } from './eligibility';

export const FIXED_POLICY_DAYS = 30;

/** Calendar days in a given month. `month` is 1-12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export interface DailySalaryInput {
  monthlySalary: number;
  basis: SalaryBasis;
  isJoiningMonth: boolean;
  /** Actual calendar days in the running month (used for calendar basis & joining month). */
  calendarDays: number;
}

/**
 * Daily salary, rounded to paise. Joining month and calendar basis divide by
 * actual calendar days; the fixed policy divides by 30. Rounding to paise here
 * matches how payroll quotes the daily rate and the spec's worked example
 * (₹333.33/day × 3 days = ₹999.99, not ₹1000).
 */
export function dailySalary(input: DailySalaryInput): number {
  const useCalendar = input.isJoiningMonth || input.basis === 'calendar';
  const divisor = useCalendar ? input.calendarDays : FIXED_POLICY_DAYS;
  return round2(input.monthlySalary / divisor);
}

export interface SalaryInput {
  monthlySalary: number;
  basis: SalaryBasis;
  isJoiningMonth: boolean;
  calendarDays: number;
  tenureMonths: number;
  workedDays: number;
  status: EmployeeStatus;
  leaveUsed: number;
  tiffinTotal: number;
  /** Advance recovered from this month's salary (from the repayment plan). */
  advanceAdjustment?: number;
  /** Custom payroll-block earnings to add (bonus, overtime, incentive…). */
  extraEarnings?: number;
  /** Custom payroll-block deductions to subtract (penalty, advance recovery…). */
  extraDeductions?: number;
}

export interface SalaryBreakdown {
  daily: number;
  eligible: boolean;
  freeLeaveAllowed: number;
  freeLeaveUsed: number;
  leaveUnused: number;
  deductibleDays: number;
  leaveDeduction: number;
  /** Salary portion only (excludes tiffin CTC and advance recovery). */
  salaryPayable: number;
  totalEarnings: number;
  totalDeductions: number;
  /** All deductions combined: leave + custom + advance recovery. */
  deductionTotal: number;
  tiffinTotal: number;
  /** Advance recovered from this month's salary. */
  advanceAdjustment: number;
  /** Take-home salary (gross + additions − deductions − advance). Excludes tiffin. */
  netSalary: number;
  /** Take-home + tiffin CTC (total company outlay). */
  finalPayable: number;
}

/** Full salary breakdown for one employee in one month. */
export function calculateSalary(input: SalaryInput): SalaryBreakdown {
  const daily = dailySalary({
    monthlySalary: input.monthlySalary,
    basis: input.basis,
    isJoiningMonth: input.isJoiningMonth,
    calendarDays: input.calendarDays,
  });

  const { eligible, freeLeaveAllowed } = evaluateEligibility({
    tenureMonths: input.tenureMonths,
    workedDays: input.workedDays,
    status: input.status,
  });

  const freeLeaveUsed = Math.min(input.leaveUsed, freeLeaveAllowed);
  const leaveUnused = Math.max(0, freeLeaveAllowed - input.leaveUsed);
  const deductibleDays = Math.max(0, input.leaveUsed - freeLeaveAllowed);
  const leaveDeduction = round2(deductibleDays * daily);

  const extraEarnings = input.extraEarnings ?? 0;
  const extraDeductions = input.extraDeductions ?? 0;

  const advanceAdjustment = input.advanceAdjustment ?? 0;
  const totalEarnings = round2(input.monthlySalary + extraEarnings);
  const totalDeductions = round2(leaveDeduction + extraDeductions);
  const salaryPayable = round2(totalEarnings - totalDeductions);
  const deductionTotal = round2(totalDeductions + advanceAdjustment);
  const netSalary = round2(salaryPayable - advanceAdjustment);
  const finalPayable = round2(netSalary + input.tiffinTotal);

  return {
    daily,
    eligible,
    freeLeaveAllowed,
    freeLeaveUsed,
    leaveUnused,
    deductibleDays,
    leaveDeduction,
    salaryPayable,
    totalEarnings,
    totalDeductions,
    deductionTotal,
    tiffinTotal: input.tiffinTotal,
    advanceAdjustment,
    netSalary,
    finalPayable,
  };
}

/** Round to 2 decimals, avoiding binary float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

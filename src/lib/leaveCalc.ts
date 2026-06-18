/* ============================================================
   Leave impact estimation (Phase 3B fix pack, Part B)

   Live preview of what a leave request costs, respecting the payroll rules:
   - First 3 months (or <15 worked days, or resigned): NO free leave — every
     leave day is deductible.
   - Otherwise 4 free/paid leaves per month; only days beyond the remaining
     bucket are deductible. No carry-forward.
   - Daily salary uses the employee's basis (fixed 30-day vs calendar / joining).
   ============================================================ */
import type { Employee } from '../types';
import { CURRENT_MONTH } from '../data/month';
import { dailySalary, round2 } from '../services/salary';
import { evaluateEligibility } from '../services/eligibility';
import { employeeTenureMonths } from './payroll';

/** Inclusive day count between two dates — re-exported from the central util. */
export { daysInclusive as daysBetween } from './dates';

export interface LeaveImpact {
  monthlySalary: number;
  basis: Employee['basis'];
  dailySalary: number;
  eligible: boolean;
  freeLeaveAllowed: number;
  /** Leave already used this month (consumes the bucket first). */
  alreadyUsed: number;
  /** Free-leave days still available before this request. */
  freeLeaveAvailable: number;
  requestedDays: number;
  /** Days of this request covered by the free bucket. */
  paidDays: number;
  /** Days of this request that are deductible. */
  deductibleDays: number;
  deduction: number;
  /** Negative = reduces take-home. */
  netImpact: number;
}

/** Estimate the salary impact of an employee taking `requestedDays` of leave. */
export function estimateLeaveImpact(employee: Employee, requestedDays: number): LeaveImpact {
  const eligibility = evaluateEligibility({ tenureMonths: employeeTenureMonths(employee), workedDays: employee.worked, status: employee.status });
  const daily = dailySalary({ monthlySalary: employee.salary, basis: employee.basis, isJoiningMonth: employee.isJoiningMonth, calendarDays: CURRENT_MONTH.calendarDays });
  const freeLeaveAllowed = eligibility.freeLeaveAllowed;
  const alreadyUsed = employee.leaveUsed;
  const freeLeaveAvailable = Math.max(0, freeLeaveAllowed - alreadyUsed);
  const days = Math.max(0, requestedDays);
  const paidDays = Math.min(days, freeLeaveAvailable);
  const deductibleDays = Math.max(0, days - paidDays);
  const deduction = round2(deductibleDays * daily);
  return {
    monthlySalary: employee.salary,
    basis: employee.basis,
    dailySalary: daily,
    eligible: eligibility.eligible,
    freeLeaveAllowed,
    alreadyUsed,
    freeLeaveAvailable,
    requestedDays: days,
    paidDays,
    deductibleDays,
    deduction,
    netImpact: -deduction,
  };
}

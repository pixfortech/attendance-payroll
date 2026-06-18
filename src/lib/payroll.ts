/* ============================================================
   Application-level payroll adapter.

   Binds an Employee (data) to the pure payroll services using the running
   month's context. This is the single seam where a real backend would later
   provide month context and persist results — keep UI components calling these
   helpers rather than re-deriving payroll figures inline.
   ============================================================ */

import type { Employee, SalaryStatus, TiffinLabel } from '../types';
import type { Mark } from '../data/attendanceMarks';
import { daysInclusive, monthsBetween, parseDate, toISO, todayISO } from './dates';
import { computeSalary, type SalaryResult } from './salaryCalc';
import { tiffinPerDay, buildVariableScope, outstandingAdvance } from '../services';

/** Effective tiffin labels for an employee: their own labels, else the active
 *  GLOBAL labels (so imported employees with no per-person labels still get
 *  the company's standard tiffin). */
export function employeeTiffinLabels(employee: Employee, globalLabels: TiffinLabel[] = []): TiffinLabel[] {
  return employee.tiffin.length > 0 ? employee.tiffin : globalLabels;
}

/** Per-day tiffin rate for an employee (₹0 when tiffin is disabled for them). */
export function employeeTiffinPerDay(employee: Employee, globalLabels: TiffinLabel[] = []): number {
  if (employee.tiffinEnabled === false) return 0;
  return tiffinPerDay(employeeTiffinLabels(employee, globalLabels));
}

/** Total tiffin CTC payable for an employee this month (per-day × tiffin days). */
export function employeeTiffinTotal(employee: Employee, globalLabels: TiffinLabel[] = []): number {
  return employeeTiffinPerDay(employee, globalLabels) * employee.tiffinDays;
}

/** Advance recovered from this month's salary. Prefers an explicitly-applied
 *  adjustment (from the Adjust-advance flow); otherwise 0 (the repayment
 *  schedule is only a suggestion until applied). */
export function employeeAdvanceAdjustment(employee: Employee): number {
  return employee.advanceAdjustedThisMonth ?? 0;
}

/** Remaining advance balance (outstanding principal net of what's recovered). */
export function employeeAdvanceRemaining(employee: Employee): number {
  return outstandingAdvance(employee);
}

/** Tenure in whole months, computed from the (parsed) joining date — not the
 *  stored figure, which is 0 for imported records. Stops at resignation. */
export function employeeTenureMonths(employee: Employee): number {
  const join = parseDate(employee.joined);
  if (!join) return employee.tenureMonths ?? 0;
  const end = (employee.status === 'resigned' && parseDate(employee.resignedAt)) || new Date();
  return monthsBetween(join, end);
}

/** Calendar days in the company: joining → today (active) or → resignation
 *  (resigned), inclusive of both endpoints. */
export function employeeDaysWorked(employee: Employee): number {
  const join = parseDate(employee.joined);
  if (!join) return 0;
  const endISO = employee.status === 'resigned' && employee.resignedAt ? employee.resignedAt : todayISO();
  return daysInclusive(toISO(join), endISO);
}

/** Full attendance-based salary result for an employee in the running month.
 *  Pass the month's attendance `marks` (from the store's attendanceMarks) so the
 *  result matches the Attendance grid exactly; without marks it falls back to
 *  the employee's denormalised figures. This is the single salary seam used by
 *  the salary table, slip, payslip and portal. */
export function employeeBreakdown(employee: Employee, marks?: Mark[], tiffinLabels: TiffinLabel[] = []): SalaryResult {
  return computeSalary(employee, {
    marks,
    advanceAdjusted: employeeAdvanceAdjustment(employee),
    tiffinTotal: employeeTiffinTotal(employee, tiffinLabels),
  });
}

/** Approved variable scope for an employee, used by the formula builder. */
export function employeeScope(employee: Employee): Record<string, number> {
  return buildVariableScope(employee, employeeBreakdown(employee));
}

/** Outstanding (uncleared) advance balance. */
export function employeeOutstandingAdvance(employee: Employee): number {
  return outstandingAdvance(employee);
}

/** Derived salary status (Not started / Request received / Pending / Approved / Paid / On hold). */
export function salaryStatus(e: Employee): SalaryStatus {
  if (e.payrollStatus === 'paid') return 'paid';
  if (e.payrollStatus === 'approved') return 'approved';
  if (e.payrollStatus === 'hold') return 'hold';
  if (e.salaryRequested) return 'requested';
  if (e.worked === 0) return 'notstarted';
  return 'pending';
}

/** Salary can be approved with worked days, or when the employee requested it. */
export function canApproveSalary(e: Employee): boolean {
  if (e.payrollStatus === 'paid' || e.payrollStatus === 'approved') return false;
  return e.worked >= 1 || !!e.salaryRequested;
}

/** Active = not archived and not resigned. */
export function isActiveEmployee(e: Employee): boolean {
  return !e.archived && e.status === 'active';
}

/* ============================================================
   Application-level payroll adapter.

   Binds an Employee (data) to the pure payroll services using the running
   month's context. This is the single seam where a real backend would later
   provide month context and persist results — keep UI components calling these
   helpers rather than re-deriving payroll figures inline.
   ============================================================ */

import type { Employee, SalaryStatus } from '../types';
import { CURRENT_MONTH } from '../data/month';
import {
  calculateSalary,
  tiffinTotal,
  buildVariableScope,
  outstandingAdvance,
  type SalaryBreakdown,
} from '../services';

/** Total tiffin CTC payable for an employee this month. */
export function employeeTiffinTotal(employee: Employee): number {
  return tiffinTotal(employee.tiffin, employee.tiffinDays);
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

/** Full salary breakdown for an employee in the running month. */
export function employeeBreakdown(employee: Employee): SalaryBreakdown {
  return calculateSalary({
    monthlySalary: employee.salary,
    basis: employee.basis,
    isJoiningMonth: employee.isJoiningMonth,
    calendarDays: CURRENT_MONTH.calendarDays,
    tenureMonths: employee.tenureMonths,
    workedDays: employee.worked,
    status: employee.status,
    leaveUsed: employee.leaveUsed,
    tiffinTotal: employeeTiffinTotal(employee),
    advanceAdjustment: employeeAdvanceAdjustment(employee),
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

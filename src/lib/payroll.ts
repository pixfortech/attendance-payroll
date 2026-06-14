/* ============================================================
   Application-level payroll adapter.

   Binds an Employee (data) to the pure payroll services using the running
   month's context. This is the single seam where a real backend would later
   provide month context and persist results — keep UI components calling these
   helpers rather than re-deriving payroll figures inline.
   ============================================================ */

import type { Employee } from '../types';
import { CURRENT_MONTH } from '../data/month';
import {
  calculateSalary,
  tiffinTotal,
  buildVariableScope,
  outstandingAdvance,
  advanceAdjustmentForMonth,
  advanceRemaining,
  type SalaryBreakdown,
} from '../services';

/** Total tiffin CTC payable for an employee this month. */
export function employeeTiffinTotal(employee: Employee): number {
  return tiffinTotal(employee.tiffin, employee.tiffinDays);
}

/** Advance recovered from this month's salary, per the repayment plan. */
export function employeeAdvanceAdjustment(employee: Employee): number {
  return advanceAdjustmentForMonth(employee.advances, CURRENT_MONTH.short);
}

/** Remaining advance balance after this month's recovery. */
export function employeeAdvanceRemaining(employee: Employee): number {
  return advanceRemaining(employee.advances, CURRENT_MONTH.short);
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

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
  type SalaryBreakdown,
} from '../services';

/** Total tiffin CTC payable for an employee this month. */
export function employeeTiffinTotal(employee: Employee): number {
  return tiffinTotal(employee.tiffin, employee.tiffinDays);
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

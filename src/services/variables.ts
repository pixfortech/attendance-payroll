/* ============================================================
   Approved payroll variables for the formula builder.
   Only these keys are exposed to formulas; anything else is rejected
   by the evaluator. Scope is computed from an employee + salary breakdown.
   ============================================================ */

import type { Employee } from '../types';
import type { SalaryBreakdown } from './salary';

export interface PayrollVariable {
  key: string;
  label: string;
  description: string;
}

export const FORMULA_VARIABLES: PayrollVariable[] = [
  { key: 'days_present', label: 'Days present', description: 'Days marked present this month' },
  { key: 'days_absent', label: 'Days absent', description: 'Days marked absent this month' },
  { key: 'days_half', label: 'Half days', description: 'Half-day attendances this month' },
  { key: 'paid_leave_allowed', label: 'Free leave/mo', description: 'Free paid leaves allowed (4 if eligible)' },
  { key: 'paid_leave_used', label: 'Leave used', description: 'Free leave days consumed' },
  { key: 'paid_leave_unused', label: 'Leave unused', description: 'Free leave days remaining' },
  { key: 'days_absent_deductible', label: 'Deductible absent', description: 'Leave/absent days above the free bucket' },
  { key: 'monthly_salary', label: 'Monthly salary', description: 'Gross monthly salary' },
  { key: 'daily_salary', label: 'Daily salary', description: 'Per-day salary from the chosen basis' },
  { key: 'tiffin_total', label: 'Tiffin total', description: 'Tiffin CTC payable this month' },
  { key: 'overtime_hours', label: 'OT hours', description: 'Overtime hours this month' },
  { key: 'advance_amount', label: 'Advance', description: 'Outstanding advance balance' },
  { key: 'bonus_amount', label: 'Bonus', description: 'Bonus amount input' },
  { key: 'salary_payable', label: 'Salary payable', description: 'Salary after leave deduction (excl. tiffin)' },
  { key: 'total_earnings', label: 'Total earnings', description: 'Gross + custom earnings' },
  { key: 'total_deductions', label: 'Total deductions', description: 'Leave + custom deductions' },
  { key: 'final_payable', label: 'Final payable', description: 'Salary payable + tiffin CTC' },
];

export const FORMULA_VARIABLE_KEYS = FORMULA_VARIABLES.map((v) => v.key);

/** Outstanding (uncleared) advance balance for an employee, net of any amount
 *  already recovered against salary. */
export function outstandingAdvance(employee: Employee): number {
  return employee.advances.filter((a) => !a.cleared).reduce((sum, a) => sum + Math.max(0, a.amount - (a.recovered ?? 0)), 0);
}

/** Build the safe variable scope passed to {@link evaluateFormula}. */
export function buildVariableScope(
  employee: Employee,
  breakdown: SalaryBreakdown,
): Record<string, number> {
  return {
    days_present: employee.daysPresent,
    days_absent: employee.daysAbsent,
    days_half: employee.daysHalf,
    paid_leave_allowed: breakdown.freeLeaveAllowed,
    paid_leave_used: breakdown.freeLeaveUsed,
    paid_leave_unused: breakdown.leaveUnused,
    days_absent_deductible: breakdown.deductibleDays,
    monthly_salary: employee.salary,
    daily_salary: breakdown.daily,
    tiffin_total: breakdown.tiffinTotal,
    overtime_hours: employee.overtimeHours,
    advance_amount: outstandingAdvance(employee),
    bonus_amount: employee.bonusAmount,
    salary_payable: breakdown.salaryPayable,
    total_earnings: breakdown.totalEarnings,
    total_deductions: breakdown.totalDeductions,
    final_payable: breakdown.finalPayable,
  };
}

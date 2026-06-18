/* ============================================================
   Shared salary calculator (CRITICAL hotfix)

   ONE attendance-based salary result used by the salary table, slip modal,
   downloaded payslip, employee portal and approval/freeze. No view computes
   salary on its own.

   Formula (per spec):
     daily        = monthlySalary / 30            (fixed30)
                  = monthlySalary / daysInMonth    (calendar / joining month)
     payableDays  = present(1) + half(0.5) + paid-free-leave(1, within bucket)
                    — absent / unpaid leave / unmarked future days = 0
     grossPayableBeforeTiffin = daily × payableDays
     netPayableAfterTiffin    = gross + tiffinCTC − advanceAdjusted
                                + otherEarnings − otherDeductions
     Tiffin is included in net payable (current business rule) but is ALSO
     surfaced as its own field so it can be shown separately for reporting.

   The attendance source is the SAME month grid the Attendance page uses
   (`attendanceMarks`), passed in as `marks`, so worked days always match.
   ============================================================ */
import type { Employee } from '../types';
import { countMark, workedFromMarks, type Mark } from '../data/attendanceMarks';
import { CURRENT_MONTH } from '../data/month';
import { dailySalary, round2, type SalaryBreakdown } from '../services/salary';
import { evaluateEligibility } from '../services/eligibility';
import { monthsBetween, parseDate } from './dates';

/** Tenure in whole months from the parsed joining date (inline to avoid an
 *  import cycle with payroll.ts). */
function tenureMonths(employee: Employee): number {
  const join = parseDate(employee.joined);
  if (!join) return employee.tenureMonths ?? 0;
  const end = (employee.status === 'resigned' && parseDate(employee.resignedAt)) || new Date();
  return monthsBetween(join, end);
}

export interface SalaryResult extends SalaryBreakdown {
  monthlySalary: number;
  /** Alias of {@link SalaryBreakdown.daily}, clearer name for views. */
  dailyRate: number;
  presentDays: number;
  halfDays: number;
  leaveDays: number;
  absentDays: number;
  /** present + 0.5·half — matches the Attendance grid's "worked". */
  workedDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  /** worked + paid-free-leave — the days actually paid. */
  payableDays: number;
  /** daily × payableDays. */
  grossEarned: number;
  /** Free/paid leaves available this month (alias of freeLeaveAllowed). */
  freeLeaveAvailable: number;
  /** Attendance/unpaid-leave deduction from base salary (alias of leaveDeduction). */
  deduction: number;
  /** Attendance-based salary payable BEFORE tiffin (alias of grossEarned). */
  grossPayableBeforeTiffin: number;
  /** Tiffin / food allowance CTC for the month (alias of tiffinTotal). */
  tiffinCTC: number;
  /** Advance adjusted this month (alias of advanceAdjustment). */
  advanceAdjusted: number;
  /** Outstanding advance balance carried forward. */
  advanceRemaining: number;
  /** Final payable INCLUDING tiffin (alias of finalPayable) — the canonical
   *  "Net payable" shown to admins and employees. */
  netPayableAfterTiffin: number;
}

export interface SalaryContext {
  /** The month's attendance marks (preferred, shared with the grid). */
  marks?: Mark[];
  advanceAdjusted?: number;
  /** Outstanding advance balance (for display in the shared result). */
  advanceRemaining?: number;
  tiffinTotal?: number;
  otherEarnings?: number;
  otherDeductions?: number;
}

/** Attendance figures from the marks grid, or the employee's denormalised
 *  fields when marks aren't supplied. */
function attendanceOf(employee: Employee, marks?: Mark[]) {
  if (marks) {
    return { present: countMark(marks, 'P'), half: countMark(marks, 'H'), leave: countMark(marks, 'L'), absent: countMark(marks, 'A'), worked: workedFromMarks(marks) };
  }
  // employee.leaveUsed historically = leave + absent; split it back out.
  const leave = Math.max(0, employee.leaveUsed - employee.daysAbsent);
  return { present: employee.daysPresent, half: employee.daysHalf, leave, absent: employee.daysAbsent, worked: employee.worked };
}

/** The single salary calculation. */
export function computeSalary(employee: Employee, ctx: SalaryContext = {}): SalaryResult {
  const att = attendanceOf(employee, ctx.marks);
  const daily = dailySalary({ monthlySalary: employee.salary, basis: employee.basis, isJoiningMonth: employee.isJoiningMonth, calendarDays: CURRENT_MONTH.calendarDays });
  const { eligible, freeLeaveAllowed } = evaluateEligibility({ tenureMonths: tenureMonths(employee), workedDays: att.worked, status: employee.status });

  const paidLeaveDays = Math.min(att.leave, freeLeaveAllowed);
  const unpaidLeaveDays = Math.max(0, att.leave - paidLeaveDays);
  const workedDays = round2(att.worked);
  const payableDays = round2(workedDays + paidLeaveDays);
  const grossEarned = round2(daily * payableDays);

  const advanceAdjustment = ctx.advanceAdjusted ?? 0;
  const otherEarnings = ctx.otherEarnings ?? 0;
  const otherDeductions = ctx.otherDeductions ?? 0;
  const tiffinTotal = ctx.tiffinTotal ?? 0;

  const totalEarnings = round2(grossEarned + otherEarnings);
  const totalDeductions = round2(otherDeductions);
  const leaveDeduction = round2(daily * unpaidLeaveDays); // informational (already excluded from payable)
  const deductionTotal = round2(advanceAdjustment + otherDeductions);
  // Take-home BEFORE tiffin (kept for back-compat / internal use).
  const netSalary = round2(grossEarned + otherEarnings - otherDeductions - advanceAdjustment);
  // Canonical Net payable = gross + tiffin − advance + other earnings − other deductions.
  const netPayableAfterTiffin = round2(netSalary + tiffinTotal);
  const advanceRemaining = ctx.advanceRemaining ?? 0;

  return {
    daily,
    eligible,
    freeLeaveAllowed,
    freeLeaveUsed: paidLeaveDays,
    leaveUnused: Math.max(0, freeLeaveAllowed - att.leave),
    deductibleDays: unpaidLeaveDays,
    leaveDeduction,
    salaryPayable: grossEarned,
    totalEarnings,
    totalDeductions,
    deductionTotal,
    tiffinTotal,
    advanceAdjustment,
    netSalary,
    finalPayable: netPayableAfterTiffin,
    // attendance-based extras
    monthlySalary: employee.salary,
    dailyRate: daily,
    presentDays: att.present,
    halfDays: att.half,
    leaveDays: att.leave,
    absentDays: att.absent,
    workedDays,
    paidLeaveDays,
    unpaidLeaveDays,
    payableDays,
    grossEarned,
    // clearer aliases for the single shared result (Part A)
    freeLeaveAvailable: freeLeaveAllowed,
    deduction: leaveDeduction,
    grossPayableBeforeTiffin: grossEarned,
    tiffinCTC: tiffinTotal,
    advanceAdjusted: advanceAdjustment,
    advanceRemaining,
    netPayableAfterTiffin,
  };
}

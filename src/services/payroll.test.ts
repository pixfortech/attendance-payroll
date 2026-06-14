import { describe, it, expect } from 'vitest';
import { calculateSalary, dailySalary, round2 } from './salary';
import { evaluateEligibility } from './eligibility';
import { allocatePaidLeave } from './leave';
import { evaluateFormula } from './formula';
import { tiffinTotal, computeTiffinDays } from './tiffin';

describe('dailySalary', () => {
  it('fixed 30-day basis divides by 30', () => {
    expect(round2(dailySalary({ monthlySalary: 10000, basis: 'fixed30', isJoiningMonth: false, calendarDays: 31 }))).toBe(333.33);
  });

  it('calendar basis divides by actual days in month', () => {
    expect(dailySalary({ monthlySalary: 9300, basis: 'calendar', isJoiningMonth: false, calendarDays: 31 })).toBe(300);
  });

  it("a new joiner's first month always uses calendar-day logic", () => {
    // fixed30 requested, but joining month forces calendar (÷31)
    const d = dailySalary({ monthlySalary: 9300, basis: 'fixed30', isJoiningMonth: true, calendarDays: 31 });
    expect(d).toBe(300);
  });
});

describe('evaluateEligibility', () => {
  it('eligible when tenure >= 3m, worked >= 15d and active', () => {
    const r = evaluateEligibility({ tenureMonths: 6, workedDays: 20, status: 'active' });
    expect(r.eligible).toBe(true);
    expect(r.freeLeaveAllowed).toBe(4);
  });

  it('exactly 15 worked days counts as eligible', () => {
    expect(evaluateEligibility({ tenureMonths: 6, workedDays: 15, status: 'active' }).eligible).toBe(true);
  });

  it('not eligible in first 3 months', () => {
    const r = evaluateEligibility({ tenureMonths: 2, workedDays: 25, status: 'active' });
    expect(r.eligible).toBe(false);
    expect(r.freeLeaveAllowed).toBe(0);
  });

  it('not eligible when resigned mid-month', () => {
    expect(evaluateEligibility({ tenureMonths: 60, workedDays: 25, status: 'resigned' }).eligible).toBe(false);
  });
});

describe('calculateSalary — worked example from the spec', () => {
  it('₹10,000 · fixed 30-day · 7 leave days → 3 deductible → −₹999.99', () => {
    const b = calculateSalary({
      monthlySalary: 10000,
      basis: 'fixed30',
      isJoiningMonth: false,
      calendarDays: 31,
      tenureMonths: 28,
      workedDays: 23,
      status: 'active',
      leaveUsed: 7,
      tiffinTotal: 2080,
    });
    expect(round2(b.daily)).toBe(333.33);
    expect(b.eligible).toBe(true);
    expect(b.deductibleDays).toBe(3);
    expect(b.leaveDeduction).toBe(999.99);
    expect(b.salaryPayable).toBe(9000.01);
    expect(b.finalPayable).toBe(9000.01 + 2080);
  });

  it('not-eligible employee: every leave day is deductible', () => {
    const b = calculateSalary({
      monthlySalary: 8800,
      basis: 'calendar',
      isJoiningMonth: true,
      calendarDays: 31,
      tenureMonths: 2,
      workedDays: 18,
      status: 'active',
      leaveUsed: 2,
      tiffinTotal: 0,
    });
    expect(b.freeLeaveAllowed).toBe(0);
    expect(b.deductibleDays).toBe(2);
  });

  it('tiffin is added on top, never deducted', () => {
    const b = calculateSalary({
      monthlySalary: 12000, basis: 'fixed30', isJoiningMonth: false, calendarDays: 31,
      tenureMonths: 49, workedDays: 26, status: 'active', leaveUsed: 2, tiffinTotal: 2600,
    });
    expect(b.leaveDeduction).toBe(0);
    expect(b.finalPayable).toBe(12000 + 2600);
  });
});

describe('allocatePaidLeave', () => {
  it('first 4 days are paid, rest deductible', () => {
    const a = allocatePaidLeave([{ days: 3, status: 'approved' }, { days: 4, status: 'approved' }], 4);
    expect(a[0]).toMatchObject({ paidDays: 3, deductibleDays: 0 });
    expect(a[1]).toMatchObject({ paidDays: 1, deductibleDays: 3 });
  });

  it('not eligible (0 bucket): all days deductible', () => {
    const a = allocatePaidLeave([{ days: 2, status: 'approved' }], 0);
    expect(a[0]).toMatchObject({ paidDays: 0, deductibleDays: 2 });
  });
});

describe('tiffin', () => {
  it('total = per-day rate × tiffin days', () => {
    expect(tiffinTotal([{ id: '1', label: 'B', amount: 60 }, { id: '2', label: 'L', amount: 100 }], 20)).toBe(3200);
  });

  it('half-days only count when half-tiffin is enabled', () => {
    expect(computeTiffinDays({ daysPresent: 20, daysHalf: 2, halfTiffinEligible: true })).toBe(21);
    expect(computeTiffinDays({ daysPresent: 20, daysHalf: 2, halfTiffinEligible: false })).toBe(20);
  });
});

describe('evaluateFormula — safe evaluator', () => {
  const scope = { daily_salary: 333.33, days_absent_deductible: 3, monthly_salary: 10000, overtime_hours: 6 };

  it('evaluates variable × variable', () => {
    const r = evaluateFormula(['days_absent_deductible', '×', 'daily_salary'], scope);
    expect(r.ok).toBe(true);
    if (r.ok) expect(round2(r.value)).toBe(999.99);
  });

  it('respects operator precedence and parentheses', () => {
    const r = evaluateFormula(['(', 'overtime_hours', '+', '2', ')', '×', '80'], scope);
    expect(r.ok && r.value).toBe(640);
  });

  it('rejects unknown variables (no arbitrary code)', () => {
    const r = evaluateFormula(['window', '+', '1'], scope);
    expect(r.ok).toBe(false);
  });

  it('rejects code-injection attempts as unknown tokens', () => {
    const r = evaluateFormula(['constructor', '(', ')'], scope);
    expect(r.ok).toBe(false);
  });

  it('flags division by zero', () => {
    const r = evaluateFormula(['monthly_salary', '÷', '0'], scope);
    expect(r.ok).toBe(false);
  });

  it('flags mismatched parentheses', () => {
    const r = evaluateFormula(['(', 'monthly_salary'], scope);
    expect(r.ok).toBe(false);
  });
});

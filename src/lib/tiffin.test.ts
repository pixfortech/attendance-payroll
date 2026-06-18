import { describe, it, expect } from 'vitest';
import { employeeTiffinLabels, employeeTiffinPerDay, employeeTiffinTotal, employeeBreakdown } from './payroll';
import type { Employee, TiffinLabel } from '../types';
import type { Mark } from '../data/attendanceMarks';

const emp = (o: Partial<Employee>): Employee => ({
  id: 'EMP001', name: 'Gobindo Das', branch: 'Beadon Street', branchCode: 'BD', role: 'employee',
  joined: '2024-04-19', isJoiningMonth: false, tenureMonths: 0, salary: 10000, basis: 'fixed30',
  status: 'active', worked: 0, daysPresent: 0, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '', email: '',
  login: 'disabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0,
  payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o,
} as Employee);

const label = (id: string, lbl: string, amount: number): TiffinLabel => ({ id, label: lbl, amount });

/** Global company tiffin labels: Breakfast ₹60 + Lunch/Dinner ₹100 = ₹160/day. */
const GLOBAL: TiffinLabel[] = [label('g1', 'Breakfast', 60), label('g2', 'Lunch / Dinner', 100)];

/** 26-working-day grid with the given present count (rest = week-off). */
const grid = (present: number): Mark[] => Array.from({ length: 26 }, (_, i) => (i < present ? 'P' : 'O') as Mark);

describe('tiffin per-day + total (the ₹0 bug)', () => {
  it('1. sums the employee\'s own labels: ₹60 + ₹100 = ₹160/day', () => {
    expect(employeeTiffinPerDay(emp({ tiffin: GLOBAL }))).toBe(160);
  });

  it('2. total = per-day × tiffin days: 1 day × ₹160 = ₹160 (was wrongly ₹0)', () => {
    const e = emp({ tiffin: GLOBAL, tiffinDays: 1 });
    expect(employeeTiffinTotal(e)).toBe(160);
    expect(employeeTiffinTotal(e)).not.toBe(0);
  });

  it('3. falls back to active GLOBAL labels when the employee has none', () => {
    const e = emp({ tiffin: [], tiffinDays: 1 });
    expect(employeeTiffinPerDay(e, GLOBAL)).toBe(160);
    expect(employeeTiffinTotal(e, GLOBAL)).toBe(160);
  });

  it('4. the employee\'s own labels override the global labels', () => {
    const e = emp({ tiffin: [label('e1', 'Lunch only', 90)] });
    expect(employeeTiffinPerDay(e, GLOBAL)).toBe(90);
  });

  it('5. disabled (tiffinEnabled === false) → ₹0 per day and ₹0 total', () => {
    const e = emp({ tiffin: GLOBAL, tiffinDays: 10, tiffinEnabled: false });
    expect(employeeTiffinPerDay(e, GLOBAL)).toBe(0);
    expect(employeeTiffinTotal(e, GLOBAL)).toBe(0);
  });

  it('6. enabled is the default (undefined ⇒ enabled)', () => {
    expect(employeeTiffinPerDay(emp({ tiffin: GLOBAL }))).toBe(160);
  });

  it('7. no labels anywhere → ₹0 (not a crash)', () => {
    expect(employeeTiffinPerDay(emp({ tiffin: [] }), [])).toBe(0);
    expect(employeeTiffinTotal(emp({ tiffin: [], tiffinDays: 5 }), [])).toBe(0);
  });

  it('8. custom per-label amounts sum correctly', () => {
    const e = emp({ tiffin: [label('a', 'Breakfast', 45), label('b', 'Lunch', 75), label('c', 'Snacks', 20)] });
    expect(employeeTiffinPerDay(e)).toBe(140);
  });

  it('9. tiffinDays = 0 → total ₹0 even with labels', () => {
    expect(employeeTiffinTotal(emp({ tiffin: GLOBAL, tiffinDays: 0 }))).toBe(0);
  });

  it('10. total scales with tiffin days (₹160 × 22 = ₹3,520)', () => {
    expect(employeeTiffinTotal(emp({ tiffin: GLOBAL, tiffinDays: 22 }))).toBe(3520);
  });
});

describe('employeeTiffinLabels — effective label resolution', () => {
  it('11. returns the employee\'s own labels when present', () => {
    const own = [label('o', 'Custom', 50)];
    expect(employeeTiffinLabels(emp({ tiffin: own }), GLOBAL)).toBe(own);
  });

  it('12. returns the global labels when the employee has none', () => {
    expect(employeeTiffinLabels(emp({ tiffin: [] }), GLOBAL)).toEqual(GLOBAL);
  });
});

describe('tiffin does not change the SALARY portion, but is added into net payable', () => {
  it('13. the salary portion (netSalary, pre-tiffin) is identical with and without tiffin', () => {
    const withTiffin = employeeBreakdown(emp({ tiffin: GLOBAL, tiffinDays: 26 }), grid(18), GLOBAL);
    const without = employeeBreakdown(emp({ tiffin: [], tiffinDays: 0 }), grid(18), []);
    expect(withTiffin.tiffinCTC).toBe(160 * 26);
    expect(without.tiffinCTC).toBe(0);
    expect(withTiffin.netSalary).toBeCloseTo(without.netSalary, 2); // salary portion unchanged
    expect(withTiffin.netSalary).toBeCloseTo(5999.94, 2); // ₹333.33/day × 18
    // …but net payable INCLUDES the tiffin CTC (current business rule).
    expect(withTiffin.netPayableAfterTiffin).toBeCloseTo(5999.94 + 160 * 26, 2);
  });

  it('14. disabling tiffin leaves the salary portion unchanged; tiffin CTC and its net contribution drop to ₹0', () => {
    const enabled = employeeBreakdown(emp({ tiffin: GLOBAL, tiffinDays: 26 }), grid(18), GLOBAL);
    const disabled = employeeBreakdown(emp({ tiffin: GLOBAL, tiffinDays: 26, tiffinEnabled: false }), grid(18), GLOBAL);
    expect(disabled.tiffinCTC).toBe(0);
    expect(disabled.netSalary).toBeCloseTo(enabled.netSalary, 2);
    expect(disabled.netPayableAfterTiffin).toBeCloseTo(enabled.netSalary, 2); // no tiffin added
    expect(enabled.netPayableAfterTiffin).toBeGreaterThan(disabled.netPayableAfterTiffin);
  });
});

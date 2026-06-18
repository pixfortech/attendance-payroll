import { describe, it, expect } from 'vitest';
import { computeSalary } from './salaryCalc';
import type { Employee } from '../types';
import type { Mark } from '../data/attendanceMarks';

const emp = (o: Partial<Employee>): Employee => ({ id: 'EMP001', name: 'Gobindo Das', branch: 'Beadon Street', branchCode: 'BD', role: 'employee', joined: '2024-04-19', isJoiningMonth: false, tenureMonths: 0, salary: 10000, basis: 'fixed30', status: 'active', worked: 0, daysPresent: 0, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '', email: '', login: 'disabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0, payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o } as Employee);

/** 26-working-day month grid with the given counts (rest = week-off). */
const grid = (present: number, half = 0, leave = 0, absent = 0): Mark[] => {
  const a = Array.from({ length: 26 }, () => 'O' as Mark);
  let i = 0;
  const put = (n: number, m: Mark) => { for (let k = 0; k < n && i < 26; k++) a[i++] = m; };
  put(present, 'P'); put(half, 'H'); put(leave, 'L'); put(absent, 'A');
  return a;
};

describe('computeSalary — the screenshot bug', () => {
  it('18 present on ₹10,000 fixed 30-day = ₹333.33/day × 18 = ₹5,999.94 (not ₹10,000)', () => {
    const r = computeSalary(emp({}), { marks: grid(18) });
    expect(r.daily).toBeCloseTo(333.33, 2);
    expect(r.workedDays).toBe(18);
    expect(r.payableDays).toBe(18);
    expect(r.grossEarned).toBeCloseTo(5999.94, 2);
    expect(r.netSalary).toBeCloseTo(5999.94, 2);
    expect(r.netSalary).not.toBe(10000);
  });

  it('tiffin is separate and does not change net payable', () => {
    const r = computeSalary(emp({}), { marks: grid(18), tiffinTotal: 500 });
    expect(r.tiffinTotal).toBe(500);
    expect(r.netSalary).toBeCloseTo(5999.94, 2);
  });

  it('advance adjusted reduces net (₹1,000 → ₹4,999.94)', () => {
    const r = computeSalary(emp({}), { marks: grid(18), advanceAdjusted: 1000 });
    expect(r.netSalary).toBeCloseTo(4999.94, 2);
  });

  it('half-days count 0.5; paid free leave (within bucket) is payable', () => {
    const r = computeSalary(emp({}), { marks: grid(16, 2, 4) }); // 16 P + 2 H + 4 L
    expect(r.workedDays).toBe(17); // 16 + 0.5×2
    expect(r.paidLeaveDays).toBe(4); // eligible → 4 free
    expect(r.payableDays).toBe(21); // 17 + 4
  });

  it('unmarked/absent days are not paid (no silent full salary)', () => {
    expect(computeSalary(emp({}), { marks: grid(0) }).netSalary).toBe(0);
    expect(computeSalary(emp({}), { marks: grid(10, 0, 0, 5) }).workedDays).toBe(10);
  });

  it('calendar basis divides by days in month', () => {
    const r = computeSalary(emp({ basis: 'calendar' }), { marks: grid(18) });
    expect(r.daily).toBeGreaterThan(0);
    expect(r.grossEarned).toBeCloseTo(r.daily * 18, 2);
  });
});

describe('net payable now INCLUDES tiffin (current business rule)', () => {
  it('gross payable before tiffin = ₹5,999.94 (18 × ₹333.33)', () => {
    const r = computeSalary(emp({}), { marks: grid(18), tiffinTotal: 2880 });
    expect(r.grossPayableBeforeTiffin).toBeCloseTo(5999.94, 2);
  });

  it('tiffin ₹2,880 makes net payable ₹8,879.94 (gross + tiffin)', () => {
    const r = computeSalary(emp({}), { marks: grid(18), tiffinTotal: 2880 });
    expect(r.tiffinCTC).toBe(2880);
    expect(r.netPayableAfterTiffin).toBeCloseTo(8879.94, 2);
    // tiffin is NOT double-counted: net = gross + tiffin − advance exactly.
    expect(r.netPayableAfterTiffin).toBeCloseTo(r.grossPayableBeforeTiffin + r.tiffinCTC, 2);
  });

  it('advance ₹1,000 makes net payable ₹7,879.94 (gross + tiffin − advance)', () => {
    const r = computeSalary(emp({}), { marks: grid(18), tiffinTotal: 2880, advanceAdjusted: 1000 });
    expect(r.netPayableAfterTiffin).toBeCloseTo(7879.94, 2);
  });

  it('netSalary (pre-tiffin) stays ₹5,999.94 — tiffin is surfaced separately', () => {
    const r = computeSalary(emp({}), { marks: grid(18), tiffinTotal: 2880 });
    expect(r.netSalary).toBeCloseTo(5999.94, 2);
    expect(r.netPayableAfterTiffin - r.netSalary).toBeCloseTo(2880, 2);
  });

  it('exposes the Part A aliases (advanceRemaining, dailyRate, freeLeaveAvailable, deduction)', () => {
    const r = computeSalary(emp({}), { marks: grid(18), tiffinTotal: 2880, advanceRemaining: 3000 });
    expect(r.advanceRemaining).toBe(3000);
    expect(r.dailyRate).toBeCloseTo(333.33, 2);
    expect(r.freeLeaveAvailable).toBe(r.freeLeaveAllowed);
    expect(r.deduction).toBe(r.leaveDeduction);
    expect(r.grossPayableBeforeTiffin).toBe(r.grossEarned);
  });
});

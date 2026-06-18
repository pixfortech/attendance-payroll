import { describe, it, expect } from 'vitest';
import { daysBetween, estimateLeaveImpact } from './leaveCalc';
import type { Employee } from '../types';

const emp = (o: Partial<Employee>): Employee => ({ id: 'E1', name: 'Test', branch: 'Beadon Street', role: 'Cashier', joined: '', isJoiningMonth: false, tenureMonths: 12, salary: 10000, basis: 'fixed30', status: 'active', worked: 20, daysPresent: 20, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '', email: '', login: 'disabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0, payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o } as Employee);

describe('daysBetween', () => {
  it('counts an inclusive range', () => {
    expect(daysBetween('2026-03-01', '2026-03-07')).toBe(7);
    expect(daysBetween('2026-03-10', '2026-03-10')).toBe(1);
  });
  it('returns 0 for reversed/invalid ranges', () => {
    expect(daysBetween('2026-03-10', '2026-03-01')).toBe(0);
    expect(daysBetween('', '2026-03-01')).toBe(0);
  });
});

describe('estimateLeaveImpact', () => {
  it('eligible employee: 4 free leaves, deducts the rest (₹10k example)', () => {
    const r = estimateLeaveImpact(emp({}), 7);
    expect(r.eligible).toBe(true);
    expect(r.freeLeaveAllowed).toBe(4);
    expect(r.paidDays).toBe(4);
    expect(r.deductibleDays).toBe(3);
    expect(r.dailySalary).toBeCloseTo(333.33, 2);
    expect(r.deduction).toBeCloseTo(999.99, 2);
  });
  it('first 3 months: no free leave — every day deductible', () => {
    const r = estimateLeaveImpact(emp({ tenureMonths: 1 }), 3);
    expect(r.eligible).toBe(false);
    expect(r.freeLeaveAllowed).toBe(0);
    expect(r.deductibleDays).toBe(3);
    expect(r.deduction).toBeCloseTo(999.99, 2);
  });
  it('respects free leave already used this month', () => {
    const r = estimateLeaveImpact(emp({ leaveUsed: 3 }), 3);
    expect(r.freeLeaveAvailable).toBe(1);
    expect(r.paidDays).toBe(1);
    expect(r.deductibleDays).toBe(2);
  });
  it('too few worked days → not eligible (no free leave)', () => {
    expect(estimateLeaveImpact(emp({ worked: 10 }), 2).freeLeaveAllowed).toBe(0);
  });
});

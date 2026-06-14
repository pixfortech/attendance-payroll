import { describe, it, expect } from 'vitest';
import { addMonths, advanceAdjustmentForMonth, advanceRemaining, buildAdvanceSchedule } from './advance';
import { calculateSalary } from './salary';
import type { Advance } from '../types';

describe('addMonths', () => {
  it('rolls over the year', () => {
    expect(addMonths('Nov 2026', 3)).toBe('Feb 2027');
    expect(addMonths('Mar 2026', 0)).toBe('Mar 2026');
  });
});

describe('buildAdvanceSchedule — ₹10,000 at ₹2,500/mo from Jun 2026', () => {
  const schedule = buildAdvanceSchedule(10000, 2500, 'Jun 2026');
  it('produces 4 monthly entries ending cleared', () => {
    expect(schedule.length).toBe(4);
    expect(schedule.map((s) => s.month)).toEqual(['Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026']);
    expect(schedule[0]).toMatchObject({ amount: 2500, balanceAfter: 7500 });
    expect(schedule[3]).toMatchObject({ amount: 2500, balanceAfter: 0 });
  });

  it('handles a remainder in the final month', () => {
    const s = buildAdvanceSchedule(10000, 3000, 'Jun 2026');
    expect(s.length).toBe(4);
    expect(s[3].amount).toBe(1000);
    expect(s[3].balanceAfter).toBe(0);
  });
});

describe('advance adjustment + remaining for a month', () => {
  const advance: Advance = {
    id: 'a1', date: '02 Jun 2026', amount: 10000, method: 'Cash', cleared: false,
    plan: { monthlyAmount: 2500, months: 4, startMonth: 'Jun 2026' },
    schedule: buildAdvanceSchedule(10000, 2500, 'Jun 2026'),
  };
  it('reads the scheduled adjustment for a month', () => {
    expect(advanceAdjustmentForMonth([advance], 'Jul 2026')).toBe(2500);
    expect(advanceAdjustmentForMonth([advance], 'Dec 2026')).toBe(0);
  });
  it('reads the remaining balance after a month', () => {
    expect(advanceRemaining([advance], 'Jun 2026')).toBe(7500);
    expect(advanceRemaining([advance], 'Sep 2026')).toBe(0);
  });
});

describe('calculateSalary subtracts advance adjustment from net', () => {
  it('reduces final payable by the month adjustment', () => {
    const base = { monthlySalary: 10000, basis: 'fixed30' as const, isJoiningMonth: false, calendarDays: 31, tenureMonths: 12, workedDays: 26, status: 'active' as const, leaveUsed: 0, tiffinTotal: 2000 };
    const without = calculateSalary(base);
    const withAdj = calculateSalary({ ...base, advanceAdjustment: 2500 });
    expect(without.finalPayable - withAdj.finalPayable).toBe(2500);
    expect(withAdj.advanceAdjustment).toBe(2500);
  });
});

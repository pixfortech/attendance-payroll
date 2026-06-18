import { describe, it, expect } from 'vitest';
import { salaryStatus, canApproveSalary, employeeDaysWorked, employeeTenureMonths, isActiveEmployee } from './payroll';
import type { Employee } from '../types';

const emp = (o: Partial<Employee>): Employee => ({ worked: 0, payrollStatus: 'pending', status: 'active', ...o } as Employee);

describe('tenure + days worked (parsed from joining date)', () => {
  it('computes tenure from a DD/MM/YYYY joining date — not 0 (the bug)', () => {
    expect(employeeTenureMonths(emp({ joined: '19/04/2024', status: 'active' }))).toBeGreaterThanOrEqual(3);
  });
  it('counts days worked for an active employee', () => {
    expect(employeeDaysWorked(emp({ joined: '19/04/2024', status: 'active' }))).toBeGreaterThan(300);
  });
  it('resigned employee tenure + days worked stop at the resignation date', () => {
    const e = emp({ joined: '2024-01-01', status: 'resigned', resignedAt: '2024-04-01' });
    expect(employeeTenureMonths(e)).toBe(3);
    expect(employeeDaysWorked(e)).toBe(92); // 1 Jan → 1 Apr 2024 inclusive
  });
  it('falls back to the stored tenure when the joining date is unparseable', () => {
    expect(employeeTenureMonths(emp({ joined: '—', tenureMonths: 7 }))).toBe(7);
  });
});

describe('salaryStatus + approval gating', () => {
  it('0 worked days, not requested → Not started, cannot approve', () => {
    const e = emp({ worked: 0 });
    expect(salaryStatus(e)).toBe('notstarted');
    expect(canApproveSalary(e)).toBe(false);
  });
  it('0 worked days but salary requested → Request received, can approve', () => {
    const e = emp({ worked: 0, salaryRequested: true });
    expect(salaryStatus(e)).toBe('requested');
    expect(canApproveSalary(e)).toBe(true);
  });
  it('>=1 worked day → Pending, can approve', () => {
    const e = emp({ worked: 5 });
    expect(salaryStatus(e)).toBe('pending');
    expect(canApproveSalary(e)).toBe(true);
  });
  it('approved / paid are terminal for approval', () => {
    expect(canApproveSalary(emp({ worked: 5, payrollStatus: 'approved' }))).toBe(false);
    expect(salaryStatus(emp({ worked: 5, payrollStatus: 'paid' }))).toBe('paid');
  });
  it('on hold can be re-approved when worked', () => {
    const e = emp({ worked: 5, payrollStatus: 'hold' });
    expect(salaryStatus(e)).toBe('hold');
    expect(canApproveSalary(e)).toBe(true);
  });
});

describe('isActiveEmployee', () => {
  it('excludes archived and resigned', () => {
    expect(isActiveEmployee(emp({ status: 'active' }))).toBe(true);
    expect(isActiveEmployee(emp({ archived: true }))).toBe(false);
    expect(isActiveEmployee(emp({ status: 'resigned' }))).toBe(false);
  });
});

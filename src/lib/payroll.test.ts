import { describe, it, expect } from 'vitest';
import { salaryStatus, canApproveSalary, isActiveEmployee } from './payroll';
import type { Employee } from '../types';

const emp = (o: Partial<Employee>): Employee => ({ worked: 0, payrollStatus: 'pending', status: 'active', ...o } as Employee);

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

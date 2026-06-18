import { describe, it, expect } from 'vitest';
import { buildPayslipHtml } from './payslip';
import type { Advance, Employee } from '../types';
import type { Mark } from '../data/attendanceMarks';

const emp = (o: Partial<Employee>): Employee => ({ id: 'GNG-BD-0142', name: 'Subir Maity', branch: 'Beadon Street', role: 'Cashier', joined: '', isJoiningMonth: false, tenureMonths: 12, salary: 10000, basis: 'fixed30', status: 'active', worked: 23, daysPresent: 23, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '', email: '', login: 'disabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0, payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o } as Employee);

describe('buildPayslipHtml', () => {
  it('produces a filled payslip (never blank) with the key fields', () => {
    const html = buildPayslipHtml(emp({}));
    expect(html.length).toBeGreaterThan(500);
    for (const needle of ['Ganguram Sweets', 'Subir Maity', 'GNG-BD-0142', 'Beadon Street', 'Net payable', 'Present days', 'Daily rate', 'Advance adjusted', 'Advance remaining', 'Payment status']) {
      expect(html).toContain(needle);
    }
  });

  it('reflects the advance adjusted this month + remaining balance', () => {
    // ₹1,000 recovered this month against a ₹4,000 advance → ₹3,000 remaining.
    const advance: Advance = { id: 'a1', date: '05 Mar 2026', amount: 4000, method: 'Cash', cleared: false, recovered: 1000 };
    const html = buildPayslipHtml(emp({ advances: [advance], advanceAdjustedThisMonth: 1000 }));
    expect(html).toMatch(/Advance adjusted[\s\S]*1,000/);
    expect(html).toMatch(/Advance remaining[\s\S]*3,000/);
  });

  it('uses attendance marks: 18 present on ₹10,000 fixed30 → ₹5,999.94 (not blank/₹10,000)', () => {
    const marks = Array.from({ length: 26 }, (_, i) => (i < 18 ? 'P' : 'O')) as Mark[];
    const html = buildPayslipHtml(emp({ salary: 10000, basis: 'fixed30' }), marks);
    expect(html).toContain('5,999.94'); // gross earned + net
    expect(html).toContain('Payable days');
  });
});

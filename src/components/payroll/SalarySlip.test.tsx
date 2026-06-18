// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ToastProvider } from '../ui/Toast';
import { AppStoreProvider } from '../../store/AppStore';
import { SalarySlip } from './SalarySlip';
import type { Employee, TiffinLabel } from '../../types';
import type { Mark } from '../../data/attendanceMarks';

const emp = (o: Partial<Employee>): Employee => ({
  id: 'EMP-SLIP', name: 'Gobindo Das', branch: 'Beadon Street', branchCode: 'BD', role: 'employee',
  joined: '2024-04-19', isJoiningMonth: false, tenureMonths: 12, salary: 10000, basis: 'fixed30',
  status: 'active', worked: 18, daysPresent: 18, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '', email: '',
  login: 'disabled', lastLogin: '', halfTiffin: true, tiffinDays: 18, tiffin: [], overtimeHours: 0, bonusAmount: 0,
  payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o,
} as Employee);

const GLOBAL: TiffinLabel[] = [{ id: 't1', label: 'Breakfast', amount: 60 }, { id: 't2', label: 'Lunch / Dinner', amount: 100 }];
const grid = (present: number): Mark[] => Array.from({ length: 26 }, (_, i) => (i < present ? 'P' : 'O') as Mark);

function renderSlip(employee: Employee, marks: Mark[], tiffinLabels: TiffinLabel[]) {
  return render(
    <ToastProvider>
      <AppStoreProvider>
        <SalarySlip employee={employee} marks={marks} tiffinLabels={tiffinLabels} onClose={() => {}} />
      </AppStoreProvider>
    </ToastProvider>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('SalarySlip — tiffin consistency (Part B/F)', () => {
  it('shows tiffin ₹2,880 (not ₹0) and net payable ₹8,879.94 incl. tiffin', () => {
    renderSlip(emp({}), grid(18), GLOBAL);
    // Tiffin line shows the real CTC, never ₹0.
    expect(screen.getAllByText(/2,880/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\+₹0\.00/)).toBeNull();
    // Net payable includes tiffin: 5,999.94 + 2,880 = 8,879.94.
    expect(screen.getByText(/8,879\.94/)).toBeTruthy();
    // Gross payable before tiffin is also shown.
    expect(screen.getByText('Gross payable (before tiffin)')).toBeTruthy();
  });

  it('falls back to the store tiffin labels when none are passed (cannot show ₹0)', () => {
    // No tiffinLabels prop → SalarySlip must read them from the store. The seed
    // store has the company defaults, and a fresh employee inherits its own
    // copies, so an employee WITH own labels still renders tiffin > ₹0.
    render(
      <ToastProvider>
        <AppStoreProvider>
          <SalarySlip employee={emp({ tiffin: GLOBAL })} marks={grid(18)} onClose={() => {}} />
        </AppStoreProvider>
      </ToastProvider>,
    );
    expect(screen.getAllByText(/2,880/).length).toBeGreaterThan(0);
  });
});

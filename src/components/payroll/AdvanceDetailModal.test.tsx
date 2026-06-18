// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdvanceDetailModal } from './AdvanceDetailModal';
import type { Advance, Employee } from '../../types';

afterEach(cleanup);

const employee = (o: Partial<Employee>): Employee => ({
  id: 'EMP001', name: 'Gobindo Das', branch: 'Beadon Street', branchCode: 'BD', role: 'employee',
  joined: '2024-04-19', isJoiningMonth: false, tenureMonths: 0, salary: 10000, basis: 'fixed30',
  status: 'active', worked: 0, daysPresent: 0, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '', email: '',
  login: 'disabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0,
  payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o,
} as Employee);

const advance = (o: Partial<Advance>): Advance => ({
  id: 'ADV1', date: '01/03/2026', amount: 10000, method: 'Cash', ref: 'REF-1', note: 'Festival advance',
  cleared: false, ...o,
} as Advance);

/** A trigger that opens the detail modal — mirrors the portal/admin advance rows. */
function Harness({ adv, emp }: { adv: Advance; emp: Employee }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>open</button>
      {open && <AdvanceDetailModal advance={adv} employee={emp} onClose={() => setOpen(false)} />}
    </div>
  );
}

describe('AdvanceDetailModal', () => {
  it('15. clicking the trigger opens the advance detail + repayment schedule', () => {
    render(<Harness adv={advance({})} emp={employee({})} />);
    expect(screen.queryByText('Advance detail')).toBeNull();
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByText('Advance detail')).toBeTruthy();
    expect(screen.getByText('Repayment schedule')).toBeTruthy();
  });

  it('16. remaining balance = amount − adjustments (₹10,000 − ₹4,000 = ₹6,000)', () => {
    render(<AdvanceDetailModal advance={advance({ amount: 10000, recovered: 4000 })} employee={employee({})} onClose={() => {}} />);
    expect(screen.getByText('Remaining balance')).toBeTruthy();
    expect(screen.getByText('₹6,000')).toBeTruthy();
    expect(screen.getByText('Partially adjusted')).toBeTruthy();
    expect(screen.getByText('₹4,000')).toBeTruthy(); // total adjusted
  });

  it('17. a cleared advance shows ₹0 remaining and "Cleared" status', () => {
    render(<AdvanceDetailModal advance={advance({ amount: 10000, recovered: 10000, cleared: true })} employee={employee({})} onClose={() => {}} />);
    expect(screen.getByText('Cleared')).toBeTruthy();
    expect(screen.getByText('₹0')).toBeTruthy(); // remaining balance
  });

  it('18. the modal is strictly scoped to one employee — another\'s name never appears', () => {
    render(<AdvanceDetailModal advance={advance({})} employee={employee({ id: 'EMP001', name: 'Gobindo Das' })} onClose={() => {}} />);
    expect(screen.getByText(/Gobindo Das · EMP001/)).toBeTruthy();
    expect(screen.queryByText(/Subir Maity/)).toBeNull();
  });

  it('renders the repayment schedule rows when a plan exists', () => {
    const adv = advance({
      amount: 9000,
      plan: { monthlyAmount: 3000, months: 3, startMonth: 'Mar 2026' },
      schedule: [
        { id: 's1', month: 'Mar 2026', amount: 3000, balanceAfter: 6000, done: true },
        { id: 's2', month: 'Apr 2026', amount: 3000, balanceAfter: 3000, done: false },
      ],
    });
    render(<AdvanceDetailModal advance={adv} employee={employee({})} onClose={() => {}} />);
    expect(screen.getByText('Mar 2026')).toBeTruthy();
    // 'Apr 2026' is both the last schedule month and the "Expected clearing" value.
    expect(screen.getAllByText('Apr 2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('₹3,000/mo × 3')).toBeTruthy();
  });
});

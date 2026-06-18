// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { AppStoreProvider, useAppStore } from './AppStore';
import { employeeAdvanceAdjustment, employeeAdvanceRemaining } from '../lib/payroll';

function Probe() {
  const { employees, addEmployee, addAdvance, applyAdvanceAdjustment, bulkMarkDays, addLeaveRequest } = useAppStore();
  const e = employees.find((x) => x.name === 'Adj Worker');
  return (
    <div>
      <span data-testid="worked">{e ? e.worked : -1}</span>
      <span data-testid="remaining">{e ? employeeAdvanceRemaining(e) : -1}</span>
      <span data-testid="adjusted">{e ? employeeAdvanceAdjustment(e) : -1}</span>
      <span data-testid="leaves">{e ? e.leaves.length : 0}</span>
      <button onClick={() => addEmployee({ name: 'Adj Worker', branch: 'Beadon Street', role: 'Helper', salary: 10000, basis: 'fixed30', joined: '01 Mar 2026' })}>add</button>
      {e && (
        <>
          <button onClick={() => addAdvance(e.id, { date: '05 Mar 2026', amount: 4000, method: 'Cash', cleared: false })}>advance</button>
          <button onClick={() => applyAdvanceAdjustment(e.id, 1000)}>adjust1000</button>
          <button onClick={() => applyAdvanceAdjustment(e.id, 9999)}>adjustAll</button>
          <button onClick={() => bulkMarkDays([e.id], [0, 1, 2], 'P')}>bulk3</button>
          <button onClick={() => addLeaveRequest(e.id, { dateLabel: '01–03 Mar', days: 3, type: 'Casual', reason: 'x', status: 'pending' })}>leave</button>
        </>
      )}
    </div>
  );
}

function setup() {
  return render(
    <ToastProvider>
      <AppStoreProvider>
        <Probe />
      </AppStoreProvider>
    </ToastProvider>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('advance adjustment + bulk attendance store actions', () => {
  it('applies a partial advance adjustment, reducing the remaining balance', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('advance'));
    expect(screen.getByTestId('remaining').textContent).toBe('4000');
    fireEvent.click(screen.getByText('adjust1000'));
    expect(screen.getByTestId('adjusted').textContent).toBe('1000');
    expect(screen.getByTestId('remaining').textContent).toBe('3000');
  });

  it('caps adjustment at the remaining balance (full clear)', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('advance'));
    fireEvent.click(screen.getByText('adjustAll'));
    expect(screen.getByTestId('remaining').textContent).toBe('0'); // cleared
    expect(screen.getByTestId('adjusted').textContent).toBe('4000'); // capped at balance
  });

  it('bulk-marks multiple days and recalculates worked days', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('worked').textContent).toBe('0');
    fireEvent.click(screen.getByText('bulk3')); // 3 present days
    expect(screen.getByTestId('worked').textContent).toBe('3');
  });

  it('records a leave request', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('leave'));
    expect(screen.getByTestId('leaves').textContent).toBe('1');
  });
});

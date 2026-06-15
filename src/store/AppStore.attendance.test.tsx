// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { AppStoreProvider, useAppStore } from './AppStore';
import { canApproveSalary } from '../lib/payroll';

// Exercises the store directly: marking attendance must recalculate worked days
// (and therefore salary-approval eligibility) — Issue 2 of the bug report.
function Probe() {
  const { employees, addEmployee, setAttendanceMark } = useAppStore();
  const fresh = employees.find((e) => e.name === 'Probe Worker');
  return (
    <div>
      <button onClick={() => addEmployee({ name: 'Probe Worker', branch: 'Beadon Street', role: 'Helper', salary: 12000, basis: 'fixed30', joined: '01 Mar 2026' })}>add</button>
      {fresh && (
        <>
          <span data-testid="worked">{fresh.worked}</span>
          <span data-testid="approve">{canApproveSalary(fresh) ? 'yes' : 'no'}</span>
          <button onClick={() => setAttendanceMark(fresh.id, 0, 'P')}>p0</button>
          <button onClick={() => setAttendanceMark(fresh.id, 1, 'H')}>h1</button>
        </>
      )}
    </div>
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('attendance marking recalculates worked + approval', () => {
  it('Present → worked 1 (and salary becomes approvable); Half adds 0.5', () => {
    render(
      <ToastProvider>
        <AppStoreProvider>
          <Probe />
        </AppStoreProvider>
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('add'));

    // Fresh employee: 0 worked days, salary not yet approvable.
    expect(screen.getByTestId('worked').textContent).toBe('0');
    expect(screen.getByTestId('approve').textContent).toBe('no');

    // Mark one Present day → worked 1, approval now allowed.
    fireEvent.click(screen.getByText('p0'));
    expect(screen.getByTestId('worked').textContent).toBe('1');
    expect(screen.getByTestId('approve').textContent).toBe('yes');

    // Mark a Half-day → worked 1.5.
    fireEvent.click(screen.getByText('h1'));
    expect(screen.getByTestId('worked').textContent).toBe('1.5');
  });
});

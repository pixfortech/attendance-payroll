// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { AppStoreProvider, useAppStore } from './AppStore';
import { employeeBreakdown, employeeTiffinTotal } from '../lib/payroll';
import { CURRENT_MONTH } from '../data';

function Probe() {
  const { employees, tiffinLabels, attendanceMarks, salaryEntries, addEmployee, bulkMarkDays, autoMarkTiffinFromAttendance, setPayrollStatus, recalcSalaryFromAttendance } = useAppStore();
  const e = employees.find((x) => x.name === 'Freeze Worker');
  const net = e ? employeeBreakdown(e, attendanceMarks[e.id], tiffinLabels).netPayableAfterTiffin : -1;
  const preTiffinNet = e ? employeeBreakdown(e, attendanceMarks[e.id], tiffinLabels).netSalary : -1;
  const entry = e ? salaryEntries.find((s) => s.employeeId === e.id && s.month === CURRENT_MONTH.month && s.year === CURRENT_MONTH.year) : undefined;
  return (
    <div>
      <span data-testid="tiffin">{e ? employeeTiffinTotal(e, tiffinLabels) : -1}</span>
      <span data-testid="net">{net}</span>
      <span data-testid="preTiffinNet">{preTiffinNet}</span>
      <span data-testid="entryNet">{entry ? entry.netPayable : 'none'}</span>
      <button onClick={() => addEmployee({ name: 'Freeze Worker', branch: 'Beadon Street', role: 'Helper', salary: 10000, basis: 'fixed30', joined: '01 Mar 2026' })}>add</button>
      {e && (
        <>
          <button onClick={() => bulkMarkDays([e.id], [0, 1, 2, 3, 4], 'P')}>mark5</button>
          <button onClick={() => bulkMarkDays([e.id], [5], 'P')}>mark1more</button>
          <button onClick={() => autoMarkTiffinFromAttendance()}>autoTiffin</button>
          <button onClick={() => setPayrollStatus(e.id, 'approved')}>approve</button>
          <button onClick={() => recalcSalaryFromAttendance(e.id)}>recalc</button>
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

const num = (id: string) => Number(screen.getByTestId(id).textContent);

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('frozen salary entry includes tiffin + recalculation', () => {
  it('approval freezes a net-payable that INCLUDES tiffin (Part A/B)', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('mark5'));
    fireEvent.click(screen.getByText('autoTiffin')); // 5 present → 5 tiffin days → ₹800
    expect(num('tiffin')).toBe(800);
    fireEvent.click(screen.getByText('approve'));
    // The frozen entry's net equals the live net-after-tiffin, and includes tiffin.
    expect(num('entryNet')).toBeCloseTo(num('net'), 2);
    expect(num('entryNet')).toBeCloseTo(num('preTiffinNet') + 800, 2);
    expect(num('entryNet')).toBeGreaterThan(num('preTiffinNet'));
  });

  it('changing attendance after approval makes the frozen entry stale; Recalculate re-syncs it', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('mark5'));
    fireEvent.click(screen.getByText('autoTiffin'));
    fireEvent.click(screen.getByText('approve'));
    const frozen = num('entryNet');
    // Mark one more present day → live net changes, frozen entry does not (stale).
    fireEvent.click(screen.getByText('mark1more'));
    expect(num('entryNet')).toBeCloseTo(frozen, 2); // still frozen
    expect(Math.abs(num('net') - num('entryNet'))).toBeGreaterThan(0.01); // differs → "Needs recalculation"
    // Recalculate pulls the frozen entry back in line with current attendance.
    fireEvent.click(screen.getByText('recalc'));
    expect(num('entryNet')).toBeCloseTo(num('net'), 2);
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';
import { AppStoreProvider, useAppStore } from './AppStore';
import { employeeTiffinPerDay, employeeTiffinTotal } from '../lib/payroll';

function Probe() {
  const { employees, tiffinLabels, addEmployee, bulkTiffin, autoMarkTiffinFromAttendance, bulkMarkDays } = useAppStore();
  const e = employees.find((x) => x.name === 'Tiffin Worker');
  return (
    <div>
      <span data-testid="days">{e ? e.tiffinDays : -1}</span>
      <span data-testid="enabled">{e ? String(e.tiffinEnabled !== false) : 'na'}</span>
      <span data-testid="perday">{e ? employeeTiffinPerDay(e, tiffinLabels) : -1}</span>
      <span data-testid="total">{e ? employeeTiffinTotal(e, tiffinLabels) : -1}</span>
      <button onClick={() => addEmployee({ name: 'Tiffin Worker', branch: 'Beadon Street', role: 'Helper', salary: 10000, basis: 'fixed30', joined: '01 Mar 2026' })}>add</button>
      {e && (
        <>
          <button onClick={() => bulkTiffin([e.id], 'addDay')}>addDay</button>
          <button onClick={() => bulkTiffin([e.id], 'disable')}>disable</button>
          <button onClick={() => bulkTiffin([e.id], 'enable')}>enable</button>
          <button onClick={() => bulkTiffin([e.id], 'reset')}>reset</button>
          <button onClick={() => bulkMarkDays([e.id], [0, 1, 2, 3, 4], 'P')}>mark5</button>
          <button onClick={() => autoMarkTiffinFromAttendance()}>auto</button>
        </>
      )}
    </div>
  );
}

function setup() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <AppStoreProvider>
          <Probe />
        </AppStoreProvider>
      </ConfirmProvider>
    </ToastProvider>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('tiffin store actions (bulk + auto-mark from attendance)', () => {
  it('a new employee inherits the company labels: ₹60 + ₹100 = ₹160/day', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('perday').textContent).toBe('160');
    expect(screen.getByTestId('total').textContent).toBe('0'); // 0 tiffin days yet
  });

  it('bulkTiffin addDay increments tiffin days → total becomes ₹160', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('addDay'));
    expect(screen.getByTestId('days').textContent).toBe('1');
    expect(screen.getByTestId('total').textContent).toBe('160');
  });

  it('bulkTiffin disable forces ₹0 per day; enable restores ₹160 (net salary never touched)', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('addDay'));
    fireEvent.click(screen.getByText('disable'));
    expect(screen.getByTestId('enabled').textContent).toBe('false');
    expect(screen.getByTestId('perday').textContent).toBe('0');
    expect(screen.getByTestId('total').textContent).toBe('0');
    fireEvent.click(screen.getByText('enable'));
    expect(screen.getByTestId('enabled').textContent).toBe('true');
    expect(screen.getByTestId('perday').textContent).toBe('160');
  });

  it('autoMarkTiffinFromAttendance sets tiffin days from present marks (5 present → 5 days → ₹800)', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('mark5'));
    fireEvent.click(screen.getByText('auto'));
    expect(screen.getByTestId('days').textContent).toBe('5');
    expect(screen.getByTestId('total').textContent).toBe('800');
  });

  it('bulkTiffin reset zeroes tiffin days', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('addDay'));
    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('days').textContent).toBe('0');
  });
});

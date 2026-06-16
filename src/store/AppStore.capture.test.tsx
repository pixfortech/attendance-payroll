// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { AppStoreProvider, useAppStore } from './AppStore';

const denied = { qrMatched: false, gpsInsideRadius: false, wifiMatched: false, selfieCaptured: false, managerApproved: false };

function Probe() {
  const { employees, pendingSync, online, addEmployee, addCheckin, syncPendingAttendance, approveCheckin, rejectCheckin, checkins } = useAppStore();
  const e = employees.find((x) => x.name === 'Cap Worker');
  const review = e ? checkins.find((c) => c.verificationStatus === 'needs_review' && c.employeeId === e.id) : undefined;
  return (
    <div>
      <span data-testid="online">{String(online)}</span>
      <span data-testid="pending">{pendingSync.length}</span>
      <span data-testid="worked">{e ? e.worked : -1}</span>
      <span data-testid="review">{e ? checkins.filter((c) => c.verificationStatus === 'needs_review' && c.employeeId === e.id).length : 0}</span>
      <button onClick={() => addEmployee({ name: 'Cap Worker', branch: 'Beadon Street', role: 'Helper', salary: 12000, basis: 'fixed30', joined: '01 Mar 2026' })}>add</button>
      {e && (
        <>
          <button onClick={() => addCheckin({ employeeId: e.id, employeeName: e.name, branch: e.branch, method: 'gps', factors: denied, time: '9:00', source: 'gps', gpsDenied: true })}>gps</button>
          <button onClick={() => review && approveCheckin(review.id)}>approve</button>
          <button onClick={() => review && rejectCheckin(review.id, 'no proof')}>reject</button>
          <button onClick={() => void syncPendingAttendance()}>sync</button>
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

describe('attendance capture, review + offline sync', () => {
  it('GPS-denied capture goes to the review queue', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('gps'));
    expect(Number(screen.getByTestId('review').textContent)).toBe(1);
  });

  it('approving a review check-in marks present and updates worked days', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('worked').textContent).toBe('0');
    fireEvent.click(screen.getByText('gps'));
    fireEvent.click(screen.getByText('approve'));
    expect(screen.getByTestId('worked').textContent).toBe('1'); // present marked for today
    expect(Number(screen.getByTestId('review').textContent)).toBe(0);
  });

  it('rejecting a review check-in does not mark attendance', () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    fireEvent.click(screen.getByText('gps'));
    fireEvent.click(screen.getByText('reject'));
    expect(screen.getByTestId('worked').textContent).toBe('0'); // unchanged
    expect(Number(screen.getByTestId('review').textContent)).toBe(0); // moved to rejected
  });

  it('queues attendance while offline and flushes when back online', async () => {
    setup();
    fireEvent.click(screen.getByText('add'));
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('online').textContent).toBe('false');
    fireEvent.click(screen.getByText('gps'));
    expect(screen.getByTestId('pending').textContent).toBe('1'); // saved offline
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });
    expect(screen.getByTestId('pending').textContent).toBe('0'); // auto-synced
  });
});

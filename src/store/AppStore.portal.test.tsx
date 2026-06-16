// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../components/ui/Toast';
import { AppStoreProvider, useAppStore } from './AppStore';
import { portalAccessOf } from '../lib/portalAccess';

// Drives the admin portal-access actions directly and asserts the persisted
// state + audit log (Phase 3A, Step 2, Part A/E).
function Probe() {
  const { employees, updatePortalAccess, auditLog } = useAppStore();
  const e = employees.find((x) => x.name === 'Subir Maity');
  if (!e) return null;
  const a = portalAccessOf(e);
  return (
    <div>
      <span data-testid="enabled">{String(a.loginEnabled)}</span>
      <span data-testid="status">{a.loginStatus}</span>
      <span data-testid="role">{a.portalRole}</span>
      <span data-testid="pinset">{String(a.pinSet)}</span>
      <span data-testid="attempts">{a.failedAttempts}</span>
      <span data-testid="branch">{a.managerBranchCode ?? '-'}</span>
      <span data-testid="audit">{auditLog.length}</span>
      <button onClick={() => updatePortalAccess(e.id, { loginEnabled: false }, { action: 'Portal login disabled' })}>disable</button>
      <button onClick={() => updatePortalAccess(e.id, { loginEnabled: true }, { action: 'Portal login enabled' })}>enable</button>
      <button onClick={() => updatePortalAccess(e.id, { pinSet: false, failedAttempts: 0, lockedUntil: null }, { action: 'PIN reset requested' })}>reset</button>
      <button onClick={() => updatePortalAccess(e.id, { failedAttempts: 5, lockedUntil: Date.now() + 600000 }, { action: 'Locked (test)' })}>lock</button>
      <button onClick={() => updatePortalAccess(e.id, { failedAttempts: 0, lockedUntil: null }, { action: 'Account unlocked' })}>unlock</button>
      <button onClick={() => updatePortalAccess(e.id, { portalRole: 'manager', managerBranchId: 'BR-BD', managerBranchCode: 'BD' }, { action: 'Portal role changed' })}>mkmgr</button>
      <button onClick={() => updatePortalAccess(e.id, { portalRole: 'employee' }, { action: 'Portal role changed' })}>mkemp</button>
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

describe('admin portal-access controls', () => {
  it('disables and re-enables portal login (status follows pinSet)', () => {
    setup();
    fireEvent.click(screen.getByText('disable'));
    expect(screen.getByTestId('enabled').textContent).toBe('false');
    expect(screen.getByTestId('status').textContent).toBe('disabled');
    fireEvent.click(screen.getByText('enable'));
    expect(screen.getByTestId('enabled').textContent).toBe('true');
    expect(screen.getByTestId('status').textContent).toBe('active'); // legacy enabled => pinSet true
  });

  it('reset PIN sets pinSet=false and status=pin_required', () => {
    setup();
    fireEvent.click(screen.getByText('reset'));
    expect(screen.getByTestId('pinset').textContent).toBe('false');
    expect(screen.getByTestId('status').textContent).toBe('pin_required');
  });

  it('unlock clears failed attempts + lockedUntil', () => {
    setup();
    fireEvent.click(screen.getByText('lock'));
    expect(screen.getByTestId('status').textContent).toBe('locked');
    expect(screen.getByTestId('attempts').textContent).toBe('5');
    fireEvent.click(screen.getByText('unlock'));
    expect(screen.getByTestId('attempts').textContent).toBe('0');
    expect(screen.getByTestId('status').textContent).toBe('active');
  });

  it('manager role assignment sets role + branch; switching to employee clears branch', () => {
    setup();
    fireEvent.click(screen.getByText('mkmgr'));
    expect(screen.getByTestId('role').textContent).toBe('manager');
    expect(screen.getByTestId('branch').textContent).toBe('BD');
    fireEvent.click(screen.getByText('mkemp'));
    expect(screen.getByTestId('role').textContent).toBe('employee');
    expect(screen.getByTestId('branch').textContent).toBe('-'); // cleared
  });

  it('every portal-access change writes an audit entry', () => {
    setup();
    const before = Number(screen.getByTestId('audit').textContent);
    fireEvent.click(screen.getByText('disable'));
    expect(Number(screen.getByTestId('audit').textContent)).toBe(before + 1);
    fireEvent.click(screen.getByText('reset'));
    expect(Number(screen.getByTestId('audit').textContent)).toBe(before + 2);
  });
});

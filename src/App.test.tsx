// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';

// jsdom has no matchMedia; stub it so we can drive the responsive breakpoint.
function setViewport(isMobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  localStorage.clear(); // isolate persisted store between tests
  sessionStorage.clear(); // clear the "session expired" flag between tests
  // Seed a logged-in admin session (login-first app); demo mode (no Firebase).
  localStorage.setItem('gng.v1.session', JSON.stringify({ role: 'admin', name: 'Test Admin', expiresAt: Date.now() + 3600000 }));
  window.history.pushState({}, '', '/'); // reset route (jsdom history persists)
  setViewport(false); // default: desktop
});
afterEach(cleanup);

describe('App — smoke & navigation', () => {
  it('redirects to the login screen when not logged in', () => {
    localStorage.removeItem('gng.v1.session');
    render(<App />);
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: 'Dashboard' })).toBeNull();
  });

  it('mounts the admin shell with the dashboard', () => {
    render(<App />);
    // Brand wordmark in the sidebar
    expect(screen.getAllByText('Ganguram').length).toBeGreaterThan(0);
    // Topbar title for the dashboard route
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
    // KPI present
    expect(screen.getByText('Net payable — March')).toBeTruthy();
  });

  it('sidebar navigation switches screens', () => {
    render(<App />);
    const sidebar = screen.getByRole('complementary');
    fireEvent.click(within(sidebar).getByText('Employees'));
    expect(screen.getByRole('heading', { level: 1, name: 'Employee Master' })).toBeTruthy();
    // A seed employee row shows up
    expect(screen.getByText('Subir Maity')).toBeTruthy();

    fireEvent.click(within(sidebar).getByText('Formula Builder'));
    expect(screen.getByRole('heading', { level: 1, name: 'Formula Builder' })).toBeTruthy();
  });

  it('opens an employee profile from the master list', () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole('complementary')).getByText('Employees'));
    fireEvent.click(screen.getByText('Subir Maity'));
    // Detail header + tabs
    expect(screen.getByRole('heading', { level: 2, name: 'Subir Maity' })).toBeTruthy();
    expect(screen.getByText('Salary & Leave')).toBeTruthy();
    expect(screen.getByText('Login access')).toBeTruthy();
  });

  it('renders a hamburger menu on mobile viewports', () => {
    setViewport(true);
    render(<App />);
    expect(screen.getByLabelText('Open menu')).toBeTruthy();
  });

  it('dashboard stat cards navigate through to their pages', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Net payable — March'));
    expect(screen.getByRole('heading', { level: 1, name: 'Salary' })).toBeTruthy();
  });

  it('admin-login offers demo entry when Firebase is unconfigured', () => {
    window.history.pushState({}, '', '/admin-login');
    render(<App />);
    expect(screen.getByText('Master Admin sign in')).toBeTruthy();
    expect(screen.getByText('Enter demo admin')).toBeTruthy();
  });

  it('admin login routes to the admin dashboard (demo mode)', () => {
    localStorage.removeItem('gng.v1.session');
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ })); // role defaults to Admin
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();
  });

  // Enter a PIN on the phone-lock keypad (6 digits auto-submits).
  const typePin = (digits: string) => digits.split('').forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

  // Minimal employee record for seeding localStorage in login tests.
  const fullEmp = (o: Record<string, unknown>) => ({
    id: 'GNG-XX-0000', name: 'X', branch: 'Beadon Street', branchCode: 'BD', role: 'Cashier', joined: '01 Mar 2026',
    isJoiningMonth: false, tenureMonths: 1, salary: 12000, basis: 'fixed30', status: 'active',
    worked: 0, daysPresent: 0, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '+91 90000 00000', email: '',
    login: 'enabled', lastLogin: 'Never', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0,
    payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o,
  });
  const mgrAccess = { loginEnabled: true, pinSet: true, portalRole: 'manager', loginStatus: 'active', failedAttempts: 0, lockedUntil: null, lastLoginAt: null, managerBranchId: 'BR-BD', managerBranchCode: 'BD', passwordFallbackAllowed: true };

  it('manager PIN login routes to the manager portal scoped to the assigned branch', () => {
    localStorage.removeItem('gng.v1.session');
    localStorage.setItem('gng.v1.employees', JSON.stringify([
      fullEmp({ id: 'GNG-BD-9001', name: 'Test Manager', role: 'Manager', portalAccess: mgrAccess }),
      fullEmp({ id: 'GNG-BD-7001', name: 'Beadon Bob', role: 'Cashier' }),
      fullEmp({ id: 'GNG-MH-7002', name: 'Mishti Mina', branch: 'Mishti Hub', branchCode: 'MH', role: 'Cashier' }),
    ]));
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Manager')); // role chip
    fireEvent.change(screen.getByLabelText(/ID or mobile/), { target: { value: 'GNG-BD-9001' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    typePin('246813'); // 6 digits → auto-submit
    expect(screen.getByText('Manager portal')).toBeTruthy();
    expect(screen.getByText('Proof to approve')).toBeTruthy();
    // Scoped to the assigned branch: a Beadon colleague shows; a Mishti Hub one does not.
    expect(screen.getByText('Beadon Bob')).toBeTruthy();
    expect(screen.queryByText('Mishti Mina')).toBeNull();
  });

  it('blocks an employee account from using the Manager login', () => {
    localStorage.removeItem('gng.v1.session');
    localStorage.setItem('gng.v1.employees', JSON.stringify([fullEmp({ id: 'GNG-BD-7001', name: 'Plain Pam', role: 'Cashier' })]));
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Manager'));
    fireEvent.change(screen.getByLabelText(/ID or mobile/), { target: { value: 'GNG-BD-7001' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    typePin('246813');
    expect(screen.getByText(/not set up for manager login/i)).toBeTruthy();
    expect(screen.queryByText('Manager portal')).toBeNull();
  });

  it('employee PIN login routes to the portal and shows only their own data', () => {
    localStorage.removeItem('gng.v1.session');
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Employee')); // role chip
    fireEvent.change(screen.getByLabelText(/ID or mobile/), { target: { value: 'GNG-DK-0156' } }); // Pooja Roy
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    typePin('246813');
    expect(screen.getByText('Employee portal')).toBeTruthy();
    expect(screen.getAllByText('Pooja Roy').length).toBeGreaterThan(0);
    // Self-only: other employees never appear in the portal.
    expect(screen.queryByText('Subir Maity')).toBeNull();
    expect(screen.queryByText('Rina Das')).toBeNull();
  });

  it('locks PIN login after 5 failed attempts without revealing if the ID exists', () => {
    localStorage.removeItem('gng.v1.session');
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Employee'));
    fireEvent.change(screen.getByLabelText(/ID or mobile/), { target: { value: 'nobody' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    for (let i = 0; i < 5; i++) typePin('124578'); // each 6-digit entry auto-submits + fails
    expect(screen.getByText(/Too many failed attempts/i)).toBeTruthy();
  });

  it('a disabled account cannot log in', () => {
    localStorage.removeItem('gng.v1.session');
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Employee'));
    fireEvent.change(screen.getByLabelText(/ID or mobile/), { target: { value: 'GNG-BD-0177' } }); // Kartik — login disabled (seed)
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    typePin('246813');
    expect(screen.getByText(/Portal access is disabled/i)).toBeTruthy();
    expect(screen.queryByText('Employee portal')).toBeNull();
  });

  it('a locked account cannot log in', () => {
    localStorage.removeItem('gng.v1.session');
    localStorage.setItem('gng.v1.employees', JSON.stringify([
      fullEmp({ id: 'GNG-BD-9009', name: 'Locked Lee', role: 'Cashier', portalAccess: { loginEnabled: true, pinSet: true, portalRole: 'employee', loginStatus: 'locked', failedAttempts: 5, lockedUntil: Date.now() + 600000, lastLoginAt: null, managerBranchId: null, managerBranchCode: null, passwordFallbackAllowed: true } }),
    ]));
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Employee'));
    fireEvent.change(screen.getByLabelText(/ID or mobile/), { target: { value: 'GNG-BD-9009' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    typePin('246813');
    expect(screen.getByText(/Account locked/i)).toBeTruthy();
    expect(screen.queryByText('Employee portal')).toBeNull();
  });

  it('an expired session redirects to login with a session-expired message', () => {
    localStorage.setItem('gng.v1.session', JSON.stringify({ role: 'admin', name: 'Test Admin', expiresAt: Date.now() - 1000 }));
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText(/session expired/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: 'Dashboard' })).toBeNull();
  });

  it('employee detail has a back button that returns to Employee Master', () => {
    render(<App />); // admin session (beforeEach)
    fireEvent.click(within(screen.getByRole('complementary')).getByText('Employees'));
    fireEvent.click(screen.getByText('Subir Maity'));
    expect(screen.getByRole('heading', { level: 2, name: 'Subir Maity' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Employee Master' })); // BackButton
    expect(screen.getByRole('heading', { level: 1, name: 'Employee Master' })).toBeTruthy();
  });

  it('employee portal sub-section back returns to portal home', () => {
    localStorage.setItem('gng.v1.session', JSON.stringify({ role: 'employee', name: 'Pooja Roy', employeeId: 'GNG-DK-0156', expiresAt: Date.now() + 3600000 }));
    window.history.pushState({}, '', '/portal');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Profile' })); // a sub-section
    fireEvent.click(screen.getByRole('button', { name: 'Portal home' })); // BackButton
    expect(screen.queryByRole('button', { name: 'Portal home' })).toBeNull(); // back at home
  });

  it('manager portal sub-section back returns to manager home', () => {
    localStorage.setItem('gng.v1.session', JSON.stringify({ role: 'manager', name: 'Test Manager', branch: 'Beadon Street', expiresAt: Date.now() + 3600000 }));
    window.history.pushState({}, '', '/manager');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' })); // a sub-section
    fireEvent.click(screen.getByRole('button', { name: 'Manager home' })); // BackButton
    expect(screen.queryByRole('button', { name: 'Manager home' })).toBeNull(); // back at home
  });

  it('approving a salary row mutates state and re-renders', () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole('complementary')).getByText('Salary'));
    const before = screen.getAllByText('Approve').length;
    expect(before).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText('Approve')[0]);
    expect(screen.getAllByText('Approve').length).toBe(before - 1);
  });

  it('salary branch filter defaults to All branches and filters by branch', () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole('complementary')).getByText('Salary'));
    // Default = All branches: employees from different branches are both listed.
    expect(screen.getByText('Subir Maity')).toBeTruthy(); // Beadon Street
    expect(screen.getByText('Amit Ghosh')).toBeTruthy(); // Baranagar
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(''); // defaults to All, never Beadon Street
    // Filter to Baranagar by its stable code → only that branch's staff remain.
    fireEvent.change(select, { target: { value: 'BN' } });
    expect(screen.getByText('Amit Ghosh')).toBeTruthy();
    expect(screen.queryByText('Subir Maity')).toBeNull();
  });

  it('attendance lists active staff for every branch and filters per branch', () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole('complementary')).getByText('Attendance'));
    // Default = All branches: active staff from multiple branches appear (not just Beadon).
    expect(screen.getByText('Subir Maity')).toBeTruthy(); // Beadon Street
    expect(screen.getByText('Rina Das')).toBeTruthy(); // Mishti Hub
    expect(screen.getByText('Pooja Roy')).toBeTruthy(); // Dakshineshwar
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
    // Select Mishti Hub → its staff show; Beadon staff drop off.
    fireEvent.change(select, { target: { value: 'MH' } });
    expect(screen.getByText('Rina Das')).toBeTruthy();
    expect(screen.queryByText('Subir Maity')).toBeNull();
  });
});

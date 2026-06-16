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

  it('manager PIN login routes to the manager portal scoped to their branch', () => {
    localStorage.removeItem('gng.v1.session');
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Manager')); // role chip
    fireEvent.change(screen.getByLabelText(/ID or mobile/), { target: { value: 'GNG-BD-0142' } }); // Subir — Beadon Street
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    typePin('246813'); // 6 digits → auto-submit
    expect(screen.getByText('Manager portal')).toBeTruthy();
    expect(screen.getByText('Proof to approve')).toBeTruthy();
    // Branch-scoped: a Beadon colleague is shown; a Mishti Hub employee is not.
    expect(screen.getByText('Kartik Sen')).toBeTruthy(); // Beadon Street
    expect(screen.queryByText('Rina Das')).toBeNull(); // Mishti Hub
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

  it('an expired session redirects to login with a session-expired message', () => {
    localStorage.setItem('gng.v1.session', JSON.stringify({ role: 'admin', name: 'Test Admin', expiresAt: Date.now() - 1000 }));
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText(/session expired/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1, name: 'Dashboard' })).toBeNull();
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

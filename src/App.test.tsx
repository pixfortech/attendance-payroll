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

  it('login routes to the manager portal by role', () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    fireEvent.click(screen.getByText('Manager')); // role chip
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));
    expect(screen.getByText('Manager portal')).toBeTruthy();
    expect(screen.getByText('Proof to approve')).toBeTruthy();
  });

  it('approving a salary row mutates state and re-renders', () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole('complementary')).getByText('Salary'));
    const before = screen.getAllByText('Approve').length;
    expect(before).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText('Approve')[0]);
    expect(screen.getAllByText('Approve').length).toBe(before - 1);
  });
});

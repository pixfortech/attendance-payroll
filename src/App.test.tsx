// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';

afterEach(cleanup);

describe('App — smoke & navigation', () => {
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
});

import type { IconName } from '../ui/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/employees', label: 'Employees', icon: 'users' },
      { to: '/branches', label: 'Branches', icon: 'building' },
      { to: '/attendance', label: 'Attendance', icon: 'calendar' },
      { to: '/tiffin', label: 'Tiffin / Food', icon: 'utensils' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { to: '/salary', label: 'Salary', icon: 'wallet' },
      { to: '/advances', label: 'Advances', icon: 'banknote' },
      { to: '/payments', label: 'Payments', icon: 'history' },
      { to: '/formula', label: 'Formula Builder', icon: 'formula' },
      { to: '/reports', label: 'Reports', icon: 'barChart' },
      { to: '/audit', label: 'Audit Log', icon: 'shield' },
    ],
  },
];

interface PageMeta {
  title: string;
  sub: string;
}

const META: Record<string, PageMeta> = {
  '/': { title: 'Dashboard', sub: 'Welcome back, Indrajit — March 2026 payroll is in progress' },
  '/employees': { title: 'Employee Master', sub: 'Profiles, salary, leave, advances, payments & portal access' },
  '/branches': { title: 'Branch Management', sub: 'Locations, managers and policies' },
  '/attendance': { title: 'Attendance', sub: 'Mark, review and capture daily attendance' },
  '/tiffin': { title: 'Tiffin / Food Allowance', sub: 'Company-paid CTC, taken daily at branches' },
  '/salary': { title: 'Salary', sub: 'Calculate, approve and disburse monthly salaries' },
  '/advances': { title: 'Advance Money Tracker', sub: 'Employee advance ledgers and recoveries' },
  '/payments': { title: 'Payment History', sub: 'Receipts and salary paid / received confirmation' },
  '/formula': { title: 'Formula Builder', sub: 'Create custom payroll blocks with safe variables' },
  '/reports': { title: 'Reports & Export', sub: 'Generate and download payroll reports' },
  '/audit': { title: 'Audit Log', sub: 'Every admin override, recorded' },
  '/settings': { title: 'Settings', sub: 'Payroll policy & system configuration' },
};

/** Resolve the topbar title/subtitle for a pathname. */
export function getPageMeta(pathname: string): PageMeta {
  if (pathname.startsWith('/employees')) return META['/employees'];
  return META[pathname] ?? META['/'];
}

import type { Notice } from '../types';

/** Company notices surfaced in the employee portal. */
export const NOTICES: Notice[] = [
  {
    id: 'n1',
    title: 'March salary will be disbursed by 2 April',
    body: 'Net salary and tiffin allowance for March 2026 will be paid by 2 April. Please confirm receipt from your portal once paid.',
    date: '12 Mar 2026',
    tone: 'brand',
  },
  {
    id: 'n2',
    title: 'Poila Boishakh holiday',
    body: 'All branches will observe a holiday on 15 April for Poila Boishakh. Counter staff rota will be shared separately.',
    date: '10 Mar 2026',
    tone: 'info',
  },
  {
    id: 'n3',
    title: 'Update your KYC documents',
    body: 'Employees with pending PAN or appointment letters should upload them before month-end to avoid payment holds.',
    date: '04 Mar 2026',
    tone: 'warning',
  },
];

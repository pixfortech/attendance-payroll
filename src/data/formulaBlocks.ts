import type { FormulaBlock } from '../types';

/** Saved custom payroll blocks — seed presets for the Formula Builder. */
export const FORMULA_BLOCKS: FormulaBlock[] = [
  {
    id: 'fb-leave',
    label: 'Leave Deduction',
    type: 'deduction',
    tokens: ['days_absent_deductible', '×', 'daily_salary'],
    display: 'Leave Deduction',
    active: true,
    month: 'Every month',
    scope: 'all',
    scopeValues: [],
  },
  {
    id: 'fb-ot',
    label: 'Overtime',
    type: 'earning',
    tokens: ['overtime_hours', '×', '80'],
    display: 'Overtime',
    active: true,
    month: 'Every month',
    scope: 'all',
    scopeValues: [],
  },
  {
    id: 'fb-festival',
    label: 'Festival Bonus',
    type: 'earning',
    tokens: ['monthly_salary', '×', '0.5'],
    display: 'Festival Bonus',
    active: false,
    month: 'March 2026',
    scope: 'all',
    scopeValues: [],
  },
  {
    id: 'fb-advance',
    label: 'Advance Recovery',
    type: 'deduction',
    tokens: ['advance_amount'],
    display: 'Advance Recovery',
    active: true,
    month: 'Every month',
    scope: 'all',
    scopeValues: [],
  },
  {
    id: 'fb-incentive',
    label: 'Sales Incentive',
    type: 'earning',
    tokens: ['days_present', '×', '25'],
    display: 'Sales Incentive',
    active: false,
    month: 'Every month',
    scope: 'roles',
    scopeValues: ['Counter Sales', 'Cashier'],
  },
  {
    id: 'fb-tiffin',
    label: 'Tiffin Allowance',
    type: 'allowance',
    tokens: ['tiffin_total'],
    display: 'Tiffin / food allowance',
    active: true,
    month: 'Every month',
    scope: 'all',
    scopeValues: [],
  },
];

/** Block-type metadata for labels and how the result affects net pay. */
export const BLOCK_TYPE_META: Record<
  FormulaBlock['type'],
  { label: string; effect: string; sign: '+' | '−' | '' }
> = {
  earning: { label: 'Earning (add)', effect: 'Added to net', sign: '+' },
  deduction: { label: 'Deduction (subtract)', effect: 'Subtracted from net', sign: '−' },
  allowance: { label: 'Allowance (CTC)', effect: 'Added to CTC', sign: '+' },
  info: { label: 'Info only', effect: 'Display only', sign: '' },
};

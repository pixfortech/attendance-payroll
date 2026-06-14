/* ============================================================
   Ganguram Payroll — shared domain types
   ============================================================ */

/** Salary calculation basis. A new joiner's first month always uses calendar. */
export type SalaryBasis = 'fixed30' | 'calendar';

export type EmployeeStatus = 'active' | 'resigned';
export type LoginStatus = 'enabled' | 'disabled';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';

/** A single tiffin/food allowance line — company-paid CTC, never a deduction. */
export interface TiffinLabel {
  id: string;
  label: string;
  amount: number;
}

/** Advance ledger entry. */
export interface Advance {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  ref?: string;
  note?: string;
  receipt?: string | null;
  /** Adjusted/recovered against salary. */
  cleared: boolean;
}

export type PaymentType =
  | 'Salary'
  | 'Advance'
  | 'Tiffin (CTC)'
  | 'Bonus'
  | 'Incentive'
  | 'Deduction adjustment'
  | 'Other';

/** Employee-side confirmation of a recorded payment. */
export type ConfirmationStatus = 'pending' | 'confirmed' | 'disputed';

export interface Payment {
  id: string;
  type: PaymentType;
  period: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  ref?: string;
  note?: string;
  receipt?: string | null;
  status: ConfirmationStatus;
}

export type LeaveType = 'Casual' | 'Sick' | 'Earned' | 'Other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  dateLabel: string;
  days: number;
  type: LeaveType;
  reason: string;
  status: LeaveStatus;
  /** Paid vs unpaid is auto-derived from the 4-day free-leave bucket + eligibility. */
  paid: boolean;
}

export type DocumentKind = 'KYC' | 'Profile' | 'Contract';
export type DocumentStatus = 'verified' | 'pending';

export interface EmployeeDocument {
  id: string;
  name: string;
  type: DocumentKind;
  status: DocumentStatus;
}

export interface Employee {
  id: string;
  name: string;
  branch: string;
  role: string;
  joined: string;
  /** Whether the running month is this employee's joining month. */
  isJoiningMonth: boolean;
  tenureMonths: number;
  salary: number;
  basis: SalaryBasis;
  status: EmployeeStatus;

  /* This-month attendance figures */
  worked: number;
  daysPresent: number;
  daysAbsent: number;
  daysHalf: number;
  leaveUsed: number;

  /* Contact */
  phone: string;
  email: string;

  /* Portal access */
  login: LoginStatus;
  lastLogin: string;

  /* Tiffin / food allowance */
  halfTiffin: boolean;
  tiffinDays: number;
  tiffin: TiffinLabel[];

  /* Extra payroll inputs */
  overtimeHours: number;
  bonusAmount: number;

  /* Current-month payroll-run state */
  payrollStatus: PayrollStatus;
  /** Optional note surfaced on the salary slip (e.g. new-joiner rule). */
  note?: string;

  /* Ledgers */
  advances: Advance[];
  payments: Payment[];
  leaves: LeaveRequest[];
  documents: EmployeeDocument[];
}

export type PayrollStatus = 'pending' | 'approved' | 'paid' | 'hold';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  managerPhone: string;
  staffCount: number;
  presentToday: number;
  payable: number;
  status: 'active' | 'inactive';
  defaultBasis: SalaryBasis;
}

/* ---------- Formula builder ---------- */

/** earning = added to net · deduction = subtracted · allowance = CTC on top · info = display only. */
export type BlockType = 'earning' | 'deduction' | 'allowance' | 'info';
export type ScopeType = 'all' | 'branches' | 'roles' | 'employees';

export interface FormulaBlock {
  id: string;
  label: string;
  type: BlockType;
  /** Formula as an ordered token list (variables, numbers, operators). */
  tokens: string[];
  display: string;
  active: boolean;
  month: string;
  scope: ScopeType;
  scopeValues: string[];
}

/* ---------- Company notices (portal) ---------- */
export interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
  tone: 'info' | 'brand' | 'warning';
}

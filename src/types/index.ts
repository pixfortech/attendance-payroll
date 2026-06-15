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
  /** Optional repayment plan + generated schedule. */
  plan?: AdvancePlan;
  schedule?: AdvanceAdjustment[];
}

/** How an advance is recovered from salary across months. */
export interface AdvancePlan {
  monthlyAmount: number;
  months: number;
  /** Salary month the recovery starts, e.g. "Mar 2026". */
  startMonth: string;
}

/** A single scheduled (or applied) advance recovery against one salary month. */
export interface AdvanceAdjustment {
  id: string;
  month: string;
  amount: number;
  balanceAfter: number;
  /** Applied (deducted) vs merely scheduled. */
  done: boolean;
  date?: string;
  by?: string;
  note?: string;
  manualOverride?: boolean;
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
  /** Stable branch code this employee maps to (from import). */
  branchCode?: string;
  role: string;
  joined: string;
  /** Whether the running month is this employee's joining month. */
  isJoiningMonth: boolean;
  tenureMonths: number;
  salary: number;
  /** True when monthly salary is blank/null and must be set before payroll. */
  salaryMissing?: boolean;
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
  geofence: BranchGeofence;
  qr: BranchQr;
}

/* ---------- Branch geofence & QR attendance ---------- */
export interface BranchGeofence {
  latitude: number;
  longitude: number;
  /** Allowed check-in radius around the branch, in metres. */
  radiusMetres: number;
  wifiSsid?: string;
  gpsRequired: boolean;
  selfieRequired: boolean;
  managerApprovalRequired: boolean;
}

export type QrStatus = 'active' | 'expired' | 'rotated';
export type QrRotation = 'daily' | 'weekly' | 'monthly';

export interface BranchQr {
  /** Opaque, branch-specific token embedded in the QR payload. */
  token: string;
  status: QrStatus;
  rotation: QrRotation;
  generatedAt: string;
}

/* ---------- Attendance proof ---------- */
export type ProofMethod = 'qr' | 'gps' | 'selfie' | 'kiosk' | 'manual';
export type ProofStrength = 'strong' | 'medium' | 'needs_approval';

export interface ProofFactors {
  qrMatched: boolean;
  gpsInsideRadius: boolean;
  wifiMatched: boolean;
  selfieCaptured: boolean;
  managerApproved: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  branch: string;
  date: string;
  time: string;
  method: ProofMethod;
  factors: ProofFactors;
  strength: ProofStrength;
  /** false → held in the Pending Manager Approval queue. */
  approved: boolean;
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

/* ---------- Roles & session ---------- */
export type Role = 'admin' | 'manager' | 'employee';

export interface Session {
  role: Role;
  name: string;
  /** For employee sessions — the signed-in employee. */
  employeeId?: string;
  /** For manager sessions — the branch they manage. */
  branch?: string;
}

/* ---------- Audit log (admin overrides) ---------- */
export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  entity: string;
  target: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason?: string;
}

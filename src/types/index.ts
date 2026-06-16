/* ============================================================
   Ganguram Payroll — shared domain types
   ============================================================ */

/** Salary calculation basis. A new joiner's first month always uses calendar. */
export type SalaryBasis = 'fixed30' | 'calendar';

export type EmployeeStatus = 'active' | 'resigned';
export type LoginStatus = 'enabled' | 'disabled';

/* ---------- Portal access (Phase 3A, Step 2) ----------
   Admin-managed login controls for the Employee/Manager portals. No PIN (plain
   or hashed) is stored here yet — see src/lib/pinAuth.ts for the backend plan. */
export type PortalRole = 'employee' | 'manager';
export type PortalLoginStatus = 'active' | 'disabled' | 'locked' | 'pin_required';

export interface PortalAccess {
  loginEnabled: boolean;
  /** Whether the user has set a PIN (the PIN itself is never stored here). */
  pinSet: boolean;
  portalRole: PortalRole;
  /** Derived from the fields above; persisted for display + future queries. */
  loginStatus: PortalLoginStatus;
  failedAttempts: number;
  /** Epoch ms the lock expires; null when not locked. */
  lockedUntil: number | null;
  lastLoginAt: string | null;
  loginNotes?: string;
  /** For managers — the branch they manage (Firestore branchId + code). */
  managerBranchId?: string | null;
  managerBranchCode?: string | null;
  /** Whether password login is allowed as a fallback to PIN. */
  passwordFallbackAllowed: boolean;
}

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
  /** Admin-managed portal login controls (Phase 3A, Step 2). Optional for
   *  backward compatibility — derive a default with portalAccessOf(). */
  portalAccess?: PortalAccess;

  /* Tiffin / food allowance */
  halfTiffin: boolean;
  tiffinDays: number;
  tiffin: TiffinLabel[];

  /* Extra payroll inputs */
  overtimeHours: number;
  bonusAmount: number;

  /* Current-month payroll-run state */
  payrollStatus: PayrollStatus;
  /** Employee asked for their salary to be processed (allows approval at 0 worked days). */
  salaryRequested?: boolean;
  /** Archived employees are excluded from active counts and default lists. */
  archived?: boolean;
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
  archived?: boolean;
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
  /** Epoch ms when this session expires (login-first session window). */
  expiresAt?: number;
}

/* ---------- Salary status (derived) ---------- */
export type SalaryStatus = 'notstarted' | 'requested' | 'pending' | 'approved' | 'paid' | 'hold';

/* ---------- Persisted salary entry (Firestore `salaryEntries`) ----------
   A frozen snapshot of one employee's payroll for one month, written when the
   salary is approved / paid / held. The salary table prefers this over a live
   recalculation when it exists. Status uses the Firestore vocabulary. */
export type SalaryEntryStatus = 'not_started' | 'request_received' | 'pending' | 'approved' | 'paid' | 'on_hold';

export interface SalaryEntry {
  id: string;
  salaryRunId: string;
  employeeId: string;
  /** 1-12 */
  month: number;
  year: number;
  grossPayable: number;
  workedDays: number;
  leaveUsed: number;
  freeLeaveUsed: number;
  deductionTotal: number;
  advanceAdjustment: number;
  tiffinCtc: number;
  netPayable: number;
  status: SalaryEntryStatus;
  paymentId?: string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Notifications ---------- */
export type NotificationType =
  | 'salary_requested'
  | 'salary_approved'
  | 'salary_hold'
  | 'salary_paid'
  | 'payment_requested'
  | 'payment_confirmed'
  | 'payment_disputed'
  | 'leave_approved'
  | 'leave_rejected'
  | 'attendance_approved'
  | 'attendance_correction'
  | 'advance_added'
  | 'advance_adjusted'
  | 'admin_override'
  | 'portal_access';

export interface AppNotification {
  id: string;
  /** Who should see it — by role and/or specific employee. */
  recipient: { role?: Role; employeeId?: string };
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
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

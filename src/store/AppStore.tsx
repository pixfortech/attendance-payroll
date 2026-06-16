import { createContext, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type {
  Advance,
  AppNotification,
  AttendanceRecord,
  AuditEntry,
  Branch,
  BranchGeofence,
  ConfirmationStatus,
  Employee,
  EmployeeDocument,
  EmployeeStatus,
  FormulaBlock,
  LeaveRequest,
  Notice,
  Payment,
  PayrollStatus,
  PortalAccess,
  ProofFactors,
  ProofMethod,
  QrRotation,
  Role,
  SalaryEntry,
  SalaryStatus,
  Session,
  TiffinLabel,
} from '../types';
import { BRANCHES, CHECKINS, EMPLOYEES, FORMULA_BLOCKS, NOTICES } from '../data';
import { buildAttendanceMarks, figuresFromMarks, type Mark } from '../data/attendanceMarks';
import { CURRENT_MONTH } from '../data/month';
import { evaluateEligibility } from '../services/eligibility';
import { allocatePaidLeave } from '../services/leave';
import { evaluateProof, isAutoApproved } from '../services/attendance';
import { advanceRemaining } from '../services/advance';
import { tiffinPerDay } from '../services/tiffin';
import { employeeBreakdown, isActiveEmployee, salaryStatus } from '../lib/payroll';
import { loginStatusOf, portalAccessOf } from '../lib/portalAccess';
import { useToast } from '../components/ui/Toast';
import { auth, firebaseConfigured } from '../lib/firebase';
import { bulkUpsertBranches, bulkUpsertEmployees, deleteBranchDoc, deleteEmployeeDoc, loadBranches, loadEmployees, upsertBranch, upsertEmployee } from '../lib/firestoreRepo';
import {
  hydrateAttendance,
  loadAttendance,
  loadAuditLogs,
  loadSalaryEntries,
  salaryRunId,
  salaryStatusToDoc,
  saveAdvance,
  saveAdvanceAdjustment,
  saveAttendanceMark,
  saveAttendanceMarksBulk,
  saveAuditLog,
  saveCheckin,
  saveNotification,
  savePayment,
  saveSalaryEntry,
  saveSalaryRun,
  saveTiffinEntries,
  setNotificationRead as setNotificationReadDoc,
  setNotificationsRead as setNotificationsReadDocs,
  subscribeNotifications,
  updatePaymentStatusDoc,
  type SalaryRunCounts,
} from '../lib/firestoreOps';
import { onAuthStateChanged } from 'firebase/auth';

/** Company-wide default tiffin labels (used as defaults + the Tiffin module list). */
const DEFAULT_TIFFIN_LABELS: TiffinLabel[] = [
  { id: 'tl-breakfast', label: 'Breakfast', amount: 60 },
  { id: 'tl-lunch', label: 'Lunch / Dinner', amount: 100 },
];

/** Numeric employee fields an admin may override (with an audit entry). */
export const OVERRIDE_FIELDS = {
  salary: 'Monthly salary',
  worked: 'Worked days',
  leaveUsed: 'Leave used',
  daysPresent: 'Days present',
  daysAbsent: 'Days absent',
  daysHalf: 'Half days',
  tiffinDays: 'Tiffin days',
  bonusAmount: 'Bonus amount',
  overtimeHours: 'Overtime hours',
} as const;
export type OverrideField = keyof typeof OVERRIDE_FIELDS;

/** How long a login stays valid (configurable session window). */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const sessionLabel = (s: Session | null) => (s ? `${s.name} (${s.role})` : 'System');

export interface NewEmployeeInput {
  name: string;
  branch: string;
  /** Stable branch code (Firestore branchId); derived from the branch when omitted. */
  branchCode?: string;
  role: string;
  salary: number;
  basis: Employee['basis'];
  joined: string;
  phone?: string;
  email?: string;
}

export interface NewBranchInput {
  name: string;
  code: string;
  manager: string;
  managerPhone?: string;
  address?: string;
}

function makeEmployee(input: NewEmployeeInput, branches: Branch[], tiffinLabels: TiffinLabel[]): Employee {
  const code = input.branchCode ?? branches.find((b) => b.name === input.branch)?.code ?? input.branch.slice(0, 2).toUpperCase();
  const id = `GNG-${code}-${Math.floor(1000 + Math.random() * 8999)}`;
  return {
    id,
    name: input.name,
    branch: input.branch,
    branchCode: code,
    role: input.role,
    joined: input.joined,
    isJoiningMonth: true,
    tenureMonths: 0,
    salary: input.salary,
    basis: input.basis,
    status: 'active',
    worked: 0,
    daysPresent: 0,
    daysAbsent: 0,
    daysHalf: 0,
    leaveUsed: 0,
    phone: input.phone ?? '—',
    email: input.email ?? '—',
    login: 'disabled',
    lastLogin: 'Never',
    halfTiffin: true,
    tiffinDays: 0,
    tiffin: tiffinLabels.map((t) => ({ ...t, id: `${id}-${t.id}` })),
    overtimeHours: 0,
    bonusAmount: 0,
    payrollStatus: 'pending',
    advances: [],
    payments: [],
    leaves: [],
    documents: [],
  };
}

/** Recompute branch staff counts + manager from the (imported) employee list. */
function recountBranches(branches: Branch[], employees: Employee[]): Branch[] {
  return branches.map((b) => {
    const staff = employees.filter((e) => e.branchCode === b.code || e.branch === b.name);
    if (staff.length === 0) return b;
    const mgr = staff.find((e) => /manager/i.test(e.role) && !/vice/i.test(e.role)) ?? staff.find((e) => /manager/i.test(e.role));
    return { ...b, staffCount: staff.length, manager: mgr ? mgr.name : b.manager, managerPhone: mgr && mgr.phone !== '—' ? mgr.phone : b.managerPhone };
  });
}

function makeBranch(input: NewBranchInput): Branch {
  const id = `BR-${input.code || Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  return {
    id,
    name: input.name,
    code: input.code,
    address: input.address ?? '—',
    manager: input.manager,
    managerPhone: input.managerPhone ?? '—',
    staffCount: 0,
    presentToday: 0,
    payable: 0,
    status: 'active',
    defaultBasis: 'fixed30',
    geofence: { latitude: 22.5726, longitude: 88.3639, radiusMetres: 100, wifiSsid: `Ganguram-${input.code}`, gpsRequired: false, selfieRequired: false, managerApprovalRequired: false },
    qr: { token: `GNGQR-${input.code}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: 'active', rotation: 'monthly', generatedAt: '14 Mar 2026' },
  };
}

interface AppContextValue {
  employees: Employee[];
  branches: Branch[];
  formulaBlocks: FormulaBlock[];
  notices: Notice[];
  checkins: AttendanceRecord[];
  attendanceMarks: Record<string, Mark[]>;
  tiffinLabels: TiffinLabel[];
  session: Session | null;
  auditLog: AuditEntry[];
  notifications: AppNotification[];
  /** Frozen, Firestore-backed salary snapshots (preferred over live calc when present). */
  salaryEntries: SalaryEntry[];

  getEmployee: (id: string) => Employee | undefined;
  getBranch: (id: string) => Branch | undefined;

  /* Session */
  login: (session: Session) => void;
  logout: () => void;

  /* Notifications */
  notify: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (recipient: { role?: Role; employeeId?: string }) => void;

  /* Audit + override */
  logAudit: (entry: Omit<AuditEntry, 'id' | 'at' | 'by'>) => void;
  overrideEmployeeField: (employeeId: string, field: OverrideField, newValue: number, reason: string) => void;

  /* Salary request + lifecycle */
  requestSalary: (employeeId: string) => void;

  /* Admin archive / delete */
  archiveEmployee: (employeeId: string, archived: boolean) => void;
  deleteEmployee: (employeeId: string) => void;
  archiveBranch: (branchId: string, archived: boolean) => void;
  deleteBranch: (branchId: string) => void;

  /* Bulk attendance */
  bulkMark: (employeeIds: string[], dayIndex: number, mark: Mark) => void;

  /* Firestore / data source */
  firestoreActive: boolean;
  /** Merge-by-id import (branches first, then employees). */
  upsertEmployees: (employees: Employee[]) => void;
  upsertBranches: (branches: Branch[]) => void;

  /* Employees */
  addEmployee: (input: NewEmployeeInput) => void;
  addBranch: (input: NewBranchInput) => void;
  updateEmployeeProfile: (id: string, patch: Partial<Employee>) => void;
  setEmployeeStatus: (id: string, status: EmployeeStatus) => void;
  setEmployeeBasis: (id: string, basis: Employee['basis']) => void;
  setEmployeeLogin: (id: string, enabled: boolean) => void;
  /** Admin portal-access controls (enable/disable/role/branch/reset/unlock/…). */
  updatePortalAccess: (id: string, changes: Partial<PortalAccess>, meta: { action: string; reason?: string; notify?: { title: string; message: string } }) => void;
  setHalfTiffin: (id: string, enabled: boolean) => void;
  addDocument: (id: string, doc: Omit<EmployeeDocument, 'id'>) => void;
  addEmployeeTiffinLabel: (id: string, label: Omit<TiffinLabel, 'id'>) => void;
  updateEmployeeTiffinLabel: (id: string, labelId: string, patch: Partial<TiffinLabel>) => void;
  removeEmployeeTiffinLabel: (id: string, labelId: string) => void;

  /* Advances */
  addAdvance: (id: string, advance: Omit<Advance, 'id'>) => void;
  updateAdvance: (id: string, advanceId: string, patch: Partial<Advance>) => void;
  adjustAdvancesAgainstSalary: (id: string) => void;

  /* Payments */
  addPayment: (id: string, payment: Omit<Payment, 'id'>) => void;
  updatePaymentStatus: (id: string, paymentId: string, status: ConfirmationStatus) => void;
  setPayrollStatus: (id: string, status: PayrollStatus) => void;
  approveAllPending: () => number;

  /* Leave */
  setLeaveStatus: (id: string, leaveId: string, status: 'approved' | 'rejected') => void;
  addLeaveRequest: (id: string, leave: Omit<LeaveRequest, 'id' | 'paid'>) => void;

  /* Attendance */
  setAttendanceMark: (employeeId: string, dayIndex: number, mark: Mark) => void;
  addCheckin: (input: { employeeId: string; employeeName: string; branch: string; method: ProofMethod; factors: ProofFactors; time: string }) => { strength: AttendanceRecord['strength']; approved: boolean };
  approveCheckin: (id: string) => void;

  /* Branch QR & geofence */
  rotateBranchQr: (branchId: string) => void;
  updateBranchQrRotation: (branchId: string, rotation: QrRotation) => void;
  updateBranchGeofence: (branchId: string, patch: Partial<BranchGeofence>) => void;

  /* Formula blocks */
  saveFormulaBlock: (block: FormulaBlock) => void;
  toggleFormulaBlock: (blockId: string) => void;
  deleteFormulaBlock: (blockId: string) => void;

  /* Company tiffin labels */
  addTiffinLabel: (label: Omit<TiffinLabel, 'id'>) => void;
  updateTiffinLabel: (labelId: string, patch: Partial<TiffinLabel>) => void;
  removeTiffinLabel: (labelId: string) => void;
  markTiffinDay: () => number;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Versioned localStorage-backed state. Falls back to the seed on any error. */
function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `gng.v1.${key}`;
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [storageKey, state]);
  return [state, setState];
}

/** Recompute each leave's paid/unpaid flag from eligibility + the 4-day bucket. */
function recomputeLeavePaidFlags(employee: Employee): Employee {
  const { freeLeaveAllowed } = evaluateEligibility({ tenureMonths: employee.tenureMonths, workedDays: employee.worked, status: employee.status });
  const allocations = allocatePaidLeave(employee.leaves.map((l) => ({ days: l.days, status: l.status })), freeLeaveAllowed);
  return { ...employee, leaves: employee.leaves.map((l, i) => ({ ...l, paid: l.status === 'rejected' ? false : allocations[i].paid })) };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [employees, setEmployees] = usePersistentState<Employee[]>('employees', EMPLOYEES);
  const [branches, setBranches] = usePersistentState<Branch[]>('branches', BRANCHES);
  const [formulaBlocks, setFormulaBlocks] = usePersistentState<FormulaBlock[]>('formulaBlocks', FORMULA_BLOCKS);
  const [checkins, setCheckins] = usePersistentState<AttendanceRecord[]>('checkins', CHECKINS);
  const [attendanceMarks, setAttendanceMarks] = usePersistentState<Record<string, Mark[]>>('attendanceMarks', buildAttendanceMarks(EMPLOYEES));
  const [tiffinLabels, setTiffinLabels] = usePersistentState<TiffinLabel[]>('tiffinLabels', DEFAULT_TIFFIN_LABELS);
  const [session, setSession] = usePersistentState<Session | null>('session', null);
  const [auditLog, setAuditLog] = usePersistentState<AuditEntry[]>('auditLog', []);
  const [notifications, setNotifications] = usePersistentState<AppNotification[]>('notifications', []);
  const [salaryEntries, setSalaryEntries] = usePersistentState<SalaryEntry[]>('salaryEntries', []);
  const [notices] = useState<Notice[]>(NOTICES);
  const [firestoreActive, setFirestoreActive] = useState(false);
  // Keeps the live notification subscription so we can detach it on sign-out.
  const notifUnsubRef = useRef<null | (() => void)>(null);

  // Expire stale login sessions on load (redirects to login via route guards).
  // A flag lets the login screen show a "session expired" message.
  useEffect(() => {
    if (session && session.expiresAt && session.expiresAt < Date.now()) {
      try {
        sessionStorage.setItem('gng.sessionExpired', '1');
      } catch {
        /* ignore storage errors */
      }
      setSession(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When Firebase is configured and an admin signs in, load branches/employees
  // AND the operational collections from Firestore (Firestore becomes the
  // source of truth; localStorage is only the demo/offline fallback). We never
  // push the local demo seed up — we only pull down what Firestore already has,
  // so existing Firestore data is never overwritten. Errors surface a toast.
  useEffect(() => {
    if (!firebaseConfigured || !auth) return;
    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirestoreActive(false);
        notifUnsubRef.current?.();
        notifUnsubRef.current = null;
        return;
      }
      try {
        const [fbBranches, fbEmployees] = await Promise.all([loadBranches(), loadEmployees()]);
        if (fbBranches.length) setBranches(fbBranches);
        if (fbEmployees.length) setEmployees(fbEmployees);
        setFirestoreActive(true);

        // ---- Phase 2: hydrate operational collections ----
        const empForLookup = fbEmployees.length ? fbEmployees : employees;
        const brForLookup = fbBranches.length ? fbBranches : branches;
        const [attDocs, fbEntries, fbAudits] = await Promise.all([loadAttendance(), loadSalaryEntries(), loadAuditLogs()]);
        if (attDocs.length) {
          const { marks, checkins: hydratedCheckins } = hydrateAttendance(attDocs, empForLookup, brForLookup);
          if (Object.keys(marks).length) {
            setAttendanceMarks((prev) => ({ ...prev, ...marks }));
            // Firestore attendance is the source of truth for worked days — recompute
            // each affected employee's figures so salary/portal reflect it after refresh.
            setEmployees((prev) => prev.map((e) => (marks[e.id] ? { ...e, ...figuresFromMarks(marks[e.id]) } : e)));
          }
          setCheckins(hydratedCheckins);
        }
        if (fbEntries.length) setSalaryEntries(fbEntries);
        if (fbAudits.length) setAuditLog(fbAudits);

        // ---- Real-time notifications (bell updates live) ----
        notifUnsubRef.current?.();
        notifUnsubRef.current = subscribeNotifications((list) => setNotifications(list));
      } catch (err) {
        setFirestoreActive(false);
        toast((err as Error).message, 'error');
      }
    });
    return () => {
      authUnsub();
      notifUnsubRef.current?.();
      notifUnsubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistEmployee = (e: Employee) => {
    if (!firestoreActive) return;
    upsertEmployee(e).catch((err) => toast((err as Error).message, 'error'));
  };
  const persistBranch = (b: Branch) => {
    if (!firestoreActive) return;
    upsertBranch(b).catch((err) => toast((err as Error).message, 'error'));
  };
  /** Fire-and-forget a Firestore operational write (only when live). */
  const op = (run: () => Promise<void>) => {
    if (!firestoreActive) return;
    run().catch((err) => toast((err as Error).message, 'error'));
  };
  /** Resolve an employee's branch document id (for normalised collections). */
  const branchIdFor = (e: Pick<Employee, 'branch' | 'branchCode'>) =>
    branches.find((b) => b.code === e.branchCode || b.name === e.branch)?.id ?? e.branchCode ?? '';

  const updateEmployee = (employeeId: string, fn: (e: Employee) => Employee) =>
    setEmployees((prev) => prev.map((e) => (e.id === employeeId ? fn(e) : e)));
  const updateBranch = (branchId: string, fn: (b: Branch) => Branch) =>
    setBranches((prev) => prev.map((b) => (b.id === branchId ? fn(b) : b)));
  const randToken = (code: string) => `GNGQR-${code}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // ---- Audit: one path that updates local state AND persists to Firestore ----
  const pushAudit = (entry: Omit<AuditEntry, 'id' | 'at' | 'by'>): AuditEntry => {
    const full: AuditEntry = { ...entry, id: uid('aud'), at: new Date().toISOString(), by: sessionLabel(session) };
    setAuditLog((prev) => [full, ...prev]);
    op(() => saveAuditLog(full));
    return full;
  };

  // ---- Notifications: local add (+ Firestore doc; onSnapshot reconciles) ----
  const addNotif = (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const full: AppNotification = { ...n, id: uid('ntf'), read: false, createdAt: new Date().toISOString() };
    setNotifications((prev) => [full, ...prev].slice(0, 200));
    op(() => saveNotification(full));
  };

  // ---- Salary entries: build a frozen snapshot + keep the run doc counts ----
  const runCountsFor = (list: Employee[]): SalaryRunCounts => {
    const act = list.filter(isActiveEmployee);
    return {
      status: 'open',
      approvedCount: act.filter((e) => e.payrollStatus === 'approved').length,
      paidCount: act.filter((e) => e.payrollStatus === 'paid').length,
      pendingCount: act.filter((e) => ['pending', 'requested'].includes(salaryStatus(e))).length,
    };
  };
  const buildSalaryEntry = (emp: Employee, status: SalaryStatus, paymentId?: string): SalaryEntry => {
    const b = employeeBreakdown(emp);
    const id = `se-${CURRENT_MONTH.year}-${String(CURRENT_MONTH.month).padStart(2, '0')}-${emp.id}`;
    const prev = salaryEntries.find((s) => s.id === id);
    const now = new Date().toISOString();
    return {
      id,
      salaryRunId: salaryRunId(),
      employeeId: emp.id,
      month: CURRENT_MONTH.month,
      year: CURRENT_MONTH.year,
      grossPayable: emp.salaryMissing ? 0 : emp.salary,
      workedDays: emp.worked,
      leaveUsed: emp.leaveUsed,
      freeLeaveUsed: b.freeLeaveUsed,
      deductionTotal: b.deductionTotal,
      advanceAdjustment: b.advanceAdjustment,
      tiffinCtc: b.tiffinTotal,
      netPayable: b.netSalary,
      status: salaryStatusToDoc(status),
      paymentId: paymentId ?? prev?.paymentId,
      approvedAt: status === 'approved' || status === 'paid' ? prev?.approvedAt ?? now : prev?.approvedAt,
      paidAt: status === 'paid' ? now : prev?.paidAt,
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
  };
  /** Upsert a salary entry into local state + Firestore, and refresh run counts. */
  const commitSalaryEntry = (emp: Employee, status: SalaryStatus, nextList: Employee[], paymentId?: string) => {
    const se = buildSalaryEntry(emp, status, paymentId);
    setSalaryEntries((prev) => {
      const i = prev.findIndex((x) => x.id === se.id);
      if (i < 0) return [se, ...prev];
      const n = [...prev];
      n[i] = se;
      return n;
    });
    op(() => saveSalaryEntry(se));
    op(() => saveSalaryRun(runCountsFor(nextList)));
    return se;
  };

  const value = useMemo<AppContextValue>(
    () => ({
      employees,
      branches,
      formulaBlocks,
      notices,
      checkins,
      attendanceMarks,
      tiffinLabels,
      session,
      auditLog,
      notifications,
      salaryEntries,
      getEmployee: (id) => employees.find((e) => e.id === id),
      getBranch: (id) => branches.find((b) => b.id === id),

      login: (s) => {
        setSession({ ...s, expiresAt: Date.now() + SESSION_TTL_MS });
        // Record the portal sign-in (last login + clear failed attempts).
        if (s.employeeId) {
          const emp = employees.find((e) => e.id === s.employeeId);
          if (emp) {
            const a = portalAccessOf(emp);
            const merged: PortalAccess = { ...a, lastLoginAt: new Date().toISOString(), failedAttempts: 0 };
            merged.loginStatus = loginStatusOf(merged);
            const next = { ...emp, portalAccess: merged };
            updateEmployee(emp.id, () => next);
            persistEmployee(next);
          }
        }
      },
      logout: () => setSession(null),

      notify: addNotif,
      markNotificationRead: (id) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        op(() => setNotificationReadDoc(id, true));
      },
      markAllNotificationsRead: (recipient) => {
        const match = (n: AppNotification) => (recipient.role && n.recipient.role === recipient.role) || (recipient.employeeId && n.recipient.employeeId === recipient.employeeId);
        const ids = notifications.filter((n) => !n.read && match(n)).map((n) => n.id);
        setNotifications((prev) => prev.map((n) => (match(n) ? { ...n, read: true } : n)));
        op(() => setNotificationsReadDocs(ids));
      },

      requestSalary: (employeeId) => {
        const emp = employees.find((e) => e.id === employeeId);
        updateEmployee(employeeId, (e) => ({ ...e, salaryRequested: true }));
        if (emp) persistEmployee({ ...emp, salaryRequested: true });
        addNotif({ recipient: { role: 'admin' }, type: 'salary_requested', title: 'Salary requested', message: `${emp?.name ?? 'An employee'} requested salary processing`, relatedId: employeeId });
        toast('Salary request sent');
      },

      archiveEmployee: (employeeId, archived) => {
        const emp = employees.find((e) => e.id === employeeId);
        updateEmployee(employeeId, (e) => ({ ...e, archived }));
        if (emp) {
          persistEmployee({ ...emp, archived });
          pushAudit({ entity: 'Employee', target: `${emp.name} (${emp.id})`, field: 'Archived', oldValue: String(!!emp.archived), newValue: String(archived), reason: archived ? 'Archived' : 'Restored' });
        }
        toast(archived ? 'Employee archived' : 'Employee restored');
      },
      deleteEmployee: (employeeId) => {
        const emp = employees.find((e) => e.id === employeeId);
        setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
        if (firestoreActive) deleteEmployeeDoc(employeeId).catch((err) => toast((err as Error).message, 'error'));
        if (emp) pushAudit({ entity: 'Employee', target: `${emp.name} (${emp.id})`, field: 'Deleted', oldValue: 'exists', newValue: 'deleted', reason: 'Permanent delete' });
        toast('Employee deleted', 'info');
      },
      archiveBranch: (branchId, archived) => {
        const br = branches.find((b) => b.id === branchId);
        updateBranch(branchId, (b) => ({ ...b, archived }));
        if (br) {
          persistBranch({ ...br, archived });
          pushAudit({ entity: 'Branch', target: `${br.name} (${br.code})`, field: 'Archived', oldValue: String(!!br.archived), newValue: String(archived), reason: archived ? 'Archived' : 'Restored' });
        }
        toast(archived ? 'Branch archived' : 'Branch restored');
      },
      deleteBranch: (branchId) => {
        const br = branches.find((b) => b.id === branchId);
        setBranches((prev) => prev.filter((b) => b.id !== branchId));
        if (firestoreActive) deleteBranchDoc(branchId).catch((err) => toast((err as Error).message, 'error'));
        if (br) pushAudit({ entity: 'Branch', target: `${br.name} (${br.code})`, field: 'Deleted', oldValue: 'exists', newValue: 'deleted', reason: 'Permanent delete' });
        toast('Branch deleted', 'info');
      },

      logAudit: (entry) => pushAudit(entry),
      overrideEmployeeField: (employeeId, field, newValue, reason) => {
        const emp = employees.find((e) => e.id === employeeId);
        if (!emp) return;
        const oldValue = emp[field];
        updateEmployee(employeeId, (e) => ({ ...e, [field]: newValue }));
        persistEmployee({ ...emp, [field]: newValue });
        pushAudit({ entity: 'Employee', target: `${emp.name} (${emp.id})`, field: OVERRIDE_FIELDS[field], oldValue: String(oldValue), newValue: String(newValue), reason });
        addNotif({ recipient: { role: 'admin' }, type: 'admin_override', title: 'Admin override', message: `${OVERRIDE_FIELDS[field]} for ${emp.name} changed ${String(oldValue)} → ${String(newValue)}.`, relatedId: employeeId });
        toast('Override saved to audit log');
      },
      bulkMark: (employeeIds, dayIndex, mark) => {
        const idSet = new Set(employeeIds);
        const updatedById = new Map<string, Employee>();
        for (const e of employees) {
          if (!idSet.has(e.id)) continue;
          const base = attendanceMarks[e.id] ?? Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
          const row = [...base];
          row[dayIndex] = mark;
          updatedById.set(e.id, { ...e, ...figuresFromMarks(row) });
        }
        setAttendanceMarks((prev) => {
          const next = { ...prev };
          for (const id of employeeIds) {
            const base = next[id] ?? Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
            const row = [...base];
            row[dayIndex] = mark;
            next[id] = row;
          }
          return next;
        });
        setEmployees((emps) => emps.map((e) => updatedById.get(e.id) ?? e));
        // Firestore: one attendance doc per employee + their refreshed figures.
        const first = updatedById.get(employeeIds[0]);
        op(() => saveAttendanceMarksBulk({ employeeIds, branchId: first ? branchIdFor(first) : '', dayIndex, mark, by: sessionLabel(session) }));
        updatedById.forEach((e) => persistEmployee(e));
        addNotif({ recipient: { role: 'admin' }, type: 'attendance_correction', title: 'Attendance updated', message: `Bulk attendance applied to ${employeeIds.length} employee${employeeIds.length > 1 ? 's' : ''}.` });
        toast(`Marked ${employeeIds.length} employee${employeeIds.length > 1 ? 's' : ''}`);
      },

      /* ---- Firestore / data source ---- */
      firestoreActive,
      upsertBranches: (list) => {
        if (list.length === 0) return;
        const byId = new Map(branches.map((b) => [b.id, b]));
        const docs: Branch[] = [];
        for (const inc of list) {
          const ex = byId.get(inc.id);
          const next: Branch = ex
            ? { ...ex, name: inc.name, code: inc.code, address: inc.address, managerPhone: inc.managerPhone, status: inc.status, geofence: { ...ex.geofence, latitude: inc.geofence.latitude, longitude: inc.geofence.longitude, radiusMetres: inc.geofence.radiusMetres } }
            : inc;
          byId.set(inc.id, next);
          docs.push(next);
        }
        setBranches([...byId.values()]);
        if (firestoreActive) bulkUpsertBranches(docs).catch((err) => toast((err as Error).message, 'error'));
        toast(`${list.length} branch${list.length > 1 ? 'es' : ''} imported`);
      },
      upsertEmployees: (list) => {
        if (list.length === 0) return;
        const byId = new Map(employees.map((e) => [e.id, e]));
        const docs: Employee[] = [];
        const newIds: string[] = [];
        for (const inc of list) {
          const ex = byId.get(inc.id);
          const next: Employee = ex
            ? { ...ex, name: inc.name, branch: inc.branch, branchCode: inc.branchCode, role: inc.role, joined: inc.joined, salary: inc.salary, salaryMissing: inc.salaryMissing, basis: inc.basis, status: inc.status, phone: inc.phone }
            : inc;
          if (!ex) newIds.push(inc.id);
          byId.set(inc.id, next);
          docs.push(next);
        }
        const merged = [...byId.values()];
        setEmployees(merged);
        if (newIds.length) {
          setAttendanceMarks((prev) => {
            const n = { ...prev };
            for (const id of newIds) if (!n[id]) n[id] = Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
            return n;
          });
        }
        setBranches((prev) => recountBranches(prev, merged));
        if (firestoreActive) bulkUpsertEmployees(docs).catch((err) => toast((err as Error).message, 'error'));
        toast(`${list.length} employee${list.length > 1 ? 's' : ''} imported`);
      },

      /* ---- Employees ---- */
      addEmployee: (input) => {
        const emp = makeEmployee(input, branches, tiffinLabels);
        setEmployees((prev) => [emp, ...prev]);
        setAttendanceMarks((prev) => ({ ...prev, [emp.id]: Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark) }));
        persistEmployee(emp);
        toast(`${input.name} added`);
      },

      addBranch: (input) => {
        const branch = makeBranch(input);
        setBranches((prev) => [branch, ...prev]);
        persistBranch(branch);
        toast(`${input.name} added`);
      },

      updateEmployeeProfile: (id, patch) => {
        const cur = employees.find((e) => e.id === id);
        updateEmployee(id, (e) => ({ ...e, ...patch }));
        if (cur) persistEmployee({ ...cur, ...patch });
        toast('Employee updated');
      },

      setEmployeeStatus: (id, status) => {
        const cur = employees.find((e) => e.id === id);
        updateEmployee(id, (e) => recomputeLeavePaidFlags({ ...e, status }));
        if (cur) persistEmployee(recomputeLeavePaidFlags({ ...cur, status }));
        toast(status === 'resigned' ? 'Marked as resigned' : 'Marked as active');
      },

      setEmployeeBasis: (id, basis) => {
        updateEmployee(id, (e) => ({ ...e, basis }));
        toast('Salary basis updated');
      },

      setEmployeeLogin: (id, enabled) => {
        updateEmployee(id, (e) => ({ ...e, login: enabled ? 'enabled' : 'disabled' }));
        toast(enabled ? 'Portal access enabled' : 'Portal access disabled');
      },

      updatePortalAccess: (id, changes, meta) => {
        const emp = employees.find((e) => e.id === id);
        if (!emp) return;
        const prev = portalAccessOf(emp);
        const merged: PortalAccess = { ...prev, ...changes };
        // Switching to employee role clears any manager branch assignment.
        if (merged.portalRole === 'employee') {
          merged.managerBranchId = null;
          merged.managerBranchCode = null;
        }
        merged.loginStatus = loginStatusOf(merged);
        const next: Employee = { ...emp, portalAccess: merged, login: merged.loginEnabled ? ('enabled' as const) : ('disabled' as const) };
        updateEmployee(id, () => next);
        persistEmployee(next);
        // Audit: include employee code (= id), name, the action, and old → new.
        const keys = Object.keys(changes) as (keyof PortalAccess)[];
        const fmt = (a: PortalAccess) => keys.map((k) => `${k}=${String(a[k] ?? '—')}`).join(', ') || meta.action;
        pushAudit({ entity: 'Employee', target: `${emp.name} (${emp.id})`, field: meta.action, oldValue: fmt(prev), newValue: fmt(merged), reason: meta.reason });
        if (meta.notify) addNotif({ recipient: { employeeId: id }, type: 'portal_access', title: meta.notify.title, message: meta.notify.message, relatedId: id });
        toast(meta.action);
      },

      setHalfTiffin: (id, enabled) => updateEmployee(id, (e) => ({ ...e, halfTiffin: enabled })),

      addDocument: (id, doc) => {
        updateEmployee(id, (e) => ({ ...e, documents: [...e.documents, { ...doc, id: uid('doc') }] }));
        toast('Document added');
      },

      addEmployeeTiffinLabel: (id, label) => {
        updateEmployee(id, (e) => ({ ...e, tiffin: [...e.tiffin, { ...label, id: uid('tl') }] }));
        toast('Tiffin label added');
      },
      updateEmployeeTiffinLabel: (id, labelId, patch) => {
        updateEmployee(id, (e) => ({ ...e, tiffin: e.tiffin.map((t) => (t.id === labelId ? { ...t, ...patch } : t)) }));
        toast('Tiffin label updated');
      },
      removeEmployeeTiffinLabel: (id, labelId) => {
        updateEmployee(id, (e) => ({ ...e, tiffin: e.tiffin.filter((t) => t.id !== labelId) }));
        toast('Tiffin label removed');
      },

      /* ---- Advances ---- */
      addAdvance: (id, advance) => {
        const emp = employees.find((e) => e.id === id);
        const newAdv: Advance = { ...advance, id: uid('adv') };
        updateEmployee(id, (e) => ({ ...e, advances: [newAdv, ...e.advances] }));
        if (emp) {
          persistEmployee({ ...emp, advances: [newAdv, ...emp.advances] });
          op(() => saveAdvance(id, newAdv, advanceRemaining([newAdv], CURRENT_MONTH.short)));
        }
        addNotif({ recipient: { employeeId: id }, type: 'advance_added', title: 'Advance recorded', message: `An advance of ₹${advance.amount.toLocaleString('en-IN')} was recorded for ${emp?.name ?? 'you'}.`, relatedId: id });
        toast('Advance recorded');
      },
      updateAdvance: (id, advanceId, patch) => {
        const emp = employees.find((e) => e.id === id);
        updateEmployee(id, (e) => ({ ...e, advances: e.advances.map((a) => (a.id === advanceId ? { ...a, ...patch } : a)) }));
        if (emp) {
          const advances = emp.advances.map((a) => (a.id === advanceId ? { ...a, ...patch } : a));
          const adv = advances.find((a) => a.id === advanceId);
          persistEmployee({ ...emp, advances });
          if (adv) op(() => saveAdvance(id, adv, advanceRemaining([adv], CURRENT_MONTH.short)));
        }
        toast('Advance updated');
      },
      adjustAdvancesAgainstSalary: (id) => {
        const emp = employees.find((e) => e.id === id);
        updateEmployee(id, (e) => ({ ...e, advances: e.advances.map((a) => ({ ...a, cleared: true })) }));
        if (emp) {
          persistEmployee({ ...emp, advances: emp.advances.map((a) => ({ ...a, cleared: true })) });
          const seId = `se-${CURRENT_MONTH.year}-${String(CURRENT_MONTH.month).padStart(2, '0')}-${id}`;
          emp.advances
            .filter((a) => !a.cleared)
            .forEach((a) => {
              const amountAdjusted = advanceRemaining([a], CURRENT_MONTH.short);
              op(() => saveAdvance(id, { ...a, cleared: true }, 0));
              op(() => saveAdvanceAdjustment({ id: uid('adj'), advanceId: a.id, employeeId: id, salaryEntryId: seId, amountAdjusted, remainingBalance: 0, adjustedBy: sessionLabel(session) }));
            });
        }
        addNotif({ recipient: { employeeId: id }, type: 'advance_adjusted', title: 'Advance adjusted', message: 'Your advance was adjusted against salary.', relatedId: id });
        toast('Advances adjusted against salary');
      },

      /* ---- Payments ---- */
      addPayment: (id, payment) => {
        const emp = employees.find((e) => e.id === id);
        const newPay: Payment = { ...payment, id: uid('pay') };
        updateEmployee(id, (e) => ({ ...e, payments: [newPay, ...e.payments] }));
        if (emp) {
          persistEmployee({ ...emp, payments: [newPay, ...emp.payments] });
          op(() => savePayment(id, newPay));
        }
        addNotif({ recipient: { employeeId: id }, type: 'payment_requested', title: 'Confirm payment received', message: `${payment.type} of ₹${payment.amount.toLocaleString('en-IN')} was marked paid. Please confirm receipt.`, relatedId: id });
        toast(`${payment.type} recorded — pending confirmation`);
      },
      updatePaymentStatus: (id, paymentId, status) => {
        const emp = employees.find((e) => e.id === id);
        updateEmployee(id, (e) => ({ ...e, payments: e.payments.map((p) => (p.id === paymentId ? { ...p, status } : p)) }));
        if (emp) {
          persistEmployee({ ...emp, payments: emp.payments.map((p) => (p.id === paymentId ? { ...p, status } : p)) });
          op(() => updatePaymentStatusDoc(paymentId, status));
        }
        if (status === 'confirmed') addNotif({ recipient: { role: 'admin' }, type: 'payment_confirmed', title: 'Payment confirmed', message: `${emp?.name ?? 'Employee'} confirmed a payment was received.`, relatedId: id });
        if (status === 'disputed') addNotif({ recipient: { role: 'admin' }, type: 'payment_disputed', title: 'Payment disputed', message: `${emp?.name ?? 'Employee'} raised an issue with a payment.`, relatedId: id });
        toast(status === 'confirmed' ? 'Payment confirmed' : status === 'disputed' ? 'Issue raised' : 'Payment updated', status === 'disputed' ? 'info' : 'success');
      },
      setPayrollStatus: (id, status) => {
        const emp = employees.find((e) => e.id === id);
        updateEmployee(id, (e) => ({ ...e, payrollStatus: status }));
        if (emp) {
          const next = { ...emp, payrollStatus: status };
          const nextList = employees.map((e) => (e.id === id ? next : e));
          persistEmployee(next);
          // A salary entry is created/updated on every approve / pay / hold.
          const paymentId = status === 'paid' ? emp.payments.find((p) => p.type === 'Salary')?.id : undefined;
          commitSalaryEntry(next, salaryStatus(next), nextList, paymentId);
        }
        if (status === 'approved') addNotif({ recipient: { employeeId: id }, type: 'salary_approved', title: 'Salary approved', message: `${emp?.name ?? 'Your'} salary has been approved.`, relatedId: id });
        if (status === 'paid') addNotif({ recipient: { employeeId: id }, type: 'salary_paid', title: 'Salary paid', message: `${emp?.name ?? 'Your'} salary has been paid — please confirm receipt.`, relatedId: id });
        if (status === 'hold') addNotif({ recipient: { employeeId: id }, type: 'salary_hold', title: 'Salary on hold', message: `${emp?.name ?? 'Your'} salary was placed on hold.`, relatedId: id });
        toast(`Salary ${status}`);
      },
      approveAllPending: () => {
        const targets = employees.filter((e) => e.payrollStatus === 'pending' && (e.worked >= 1 || e.salaryRequested));
        if (targets.length === 0) {
          toast('No pending salaries to approve');
          return 0;
        }
        const targetIds = new Set(targets.map((e) => e.id));
        const nextList = employees.map((e) => (targetIds.has(e.id) ? { ...e, payrollStatus: 'approved' as PayrollStatus } : e));
        setEmployees(nextList);
        nextList
          .filter((e) => targetIds.has(e.id))
          .forEach((e) => {
            persistEmployee(e);
            commitSalaryEntry(e, 'approved', nextList);
            addNotif({ recipient: { employeeId: e.id }, type: 'salary_approved', title: 'Salary approved', message: 'Your salary has been approved.', relatedId: e.id });
          });
        toast(`${targets.length} salaries approved`);
        return targets.length;
      },

      /* ---- Leave ---- */
      setLeaveStatus: (id, leaveId, status) => {
        const emp = employees.find((e) => e.id === id);
        updateEmployee(id, (e) => recomputeLeavePaidFlags({ ...e, leaves: e.leaves.map((l) => (l.id === leaveId ? { ...l, status } : l)) }));
        if (emp) persistEmployee(recomputeLeavePaidFlags({ ...emp, leaves: emp.leaves.map((l) => (l.id === leaveId ? { ...l, status } : l)) }));
        addNotif({ recipient: { employeeId: id }, type: status === 'approved' ? 'leave_approved' : 'leave_rejected', title: status === 'approved' ? 'Leave approved' : 'Leave rejected', message: `${emp?.name ? emp.name + "'s" : 'Your'} leave request was ${status}.`, relatedId: id });
        toast(status === 'approved' ? 'Leave approved' : 'Leave rejected', status === 'approved' ? 'success' : 'info');
      },
      addLeaveRequest: (id, leave) => {
        const emp = employees.find((e) => e.id === id);
        const newLeave = { ...leave, id: uid('leave'), paid: false };
        updateEmployee(id, (e) => recomputeLeavePaidFlags({ ...e, leaves: [...e.leaves, newLeave] }));
        if (emp) persistEmployee(recomputeLeavePaidFlags({ ...emp, leaves: [...emp.leaves, newLeave] }));
        toast('Leave requested');
      },

      /* ---- Attendance ---- */
      setAttendanceMark: (employeeId, dayIndex, mark) => {
        const emp = employees.find((e) => e.id === employeeId);
        const base = attendanceMarks[employeeId] ?? Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
        const row = [...base];
        row[dayIndex] = mark;
        setAttendanceMarks((prev) => ({ ...prev, [employeeId]: row }));
        // keep the employee's worked / leave figures in sync with the grid
        const next = emp ? { ...emp, ...figuresFromMarks(row) } : undefined;
        setEmployees((emps) => emps.map((e) => (e.id === employeeId && next ? next : e)));
        if (next) {
          persistEmployee(next);
          op(() => saveAttendanceMark({ employeeId, branchId: branchIdFor(next), dayIndex, mark, by: sessionLabel(session) }));
        }
      },

      addCheckin: (input) => {
        const branch = branches.find((b) => b.name === input.branch);
        const strength = evaluateProof(input.factors);
        const approved = branch ? isAutoApproved(branch, input.factors) : false;
        const record: AttendanceRecord = { id: uid('chk'), date: '14 Mar 2026', strength, approved, ...input };
        setCheckins((prev) => [record, ...prev]);
        op(() => saveCheckin(record, branch?.id ?? ''));
        return { strength, approved };
      },
      approveCheckin: (id) => {
        const chk = checkins.find((c) => c.id === id);
        setCheckins((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const factors = { ...c.factors, managerApproved: true };
            return { ...c, factors, strength: evaluateProof(factors), approved: true };
          }),
        );
        if (chk) {
          const factors = { ...chk.factors, managerApproved: true };
          const updated: AttendanceRecord = { ...chk, factors, strength: evaluateProof(factors), approved: true };
          op(() => saveCheckin(updated, branches.find((b) => b.name === chk.branch)?.id ?? ''));
          addNotif({ recipient: { employeeId: chk.employeeId }, type: 'attendance_approved', title: 'Attendance approved', message: `Your ${chk.date} check-in was approved.`, relatedId: chk.employeeId });
        }
        toast('Check-in approved');
      },

      /* ---- Branch QR & geofence ---- */
      rotateBranchQr: (branchId) => {
        const cur = branches.find((b) => b.id === branchId);
        updateBranch(branchId, (b) => ({ ...b, qr: { ...b.qr, token: randToken(b.code), status: 'active', generatedAt: '14 Mar 2026' } }));
        if (cur) persistBranch({ ...cur, qr: { ...cur.qr, token: randToken(cur.code), status: 'active', generatedAt: '14 Mar 2026' } });
        toast('QR rotated — old code is now invalid');
      },
      updateBranchQrRotation: (branchId, rotation) => {
        const cur = branches.find((b) => b.id === branchId);
        updateBranch(branchId, (b) => ({ ...b, qr: { ...b.qr, rotation } }));
        if (cur) persistBranch({ ...cur, qr: { ...cur.qr, rotation } });
      },
      updateBranchGeofence: (branchId, patch) => {
        const cur = branches.find((b) => b.id === branchId);
        updateBranch(branchId, (b) => ({ ...b, geofence: { ...b.geofence, ...patch } }));
        if (cur) persistBranch({ ...cur, geofence: { ...cur.geofence, ...patch } });
      },

      /* ---- Formula blocks ---- */
      saveFormulaBlock: (block) => {
        setFormulaBlocks((prev) => (prev.some((b) => b.id === block.id) ? prev.map((b) => (b.id === block.id ? block : b)) : [block, ...prev]));
        toast('Payroll block saved');
      },
      toggleFormulaBlock: (blockId) => {
        setFormulaBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, active: !b.active } : b)));
      },
      deleteFormulaBlock: (blockId) => {
        setFormulaBlocks((prev) => prev.filter((b) => b.id !== blockId));
        toast('Payroll block deleted', 'info');
      },

      /* ---- Company tiffin labels ---- */
      addTiffinLabel: (label) => {
        setTiffinLabels((prev) => [...prev, { ...label, id: uid('tl') }]);
        toast('Tiffin label added');
      },
      updateTiffinLabel: (labelId, patch) => {
        setTiffinLabels((prev) => prev.map((t) => (t.id === labelId ? { ...t, ...patch } : t)));
        toast('Tiffin label updated');
      },
      removeTiffinLabel: (labelId) => {
        setTiffinLabels((prev) => prev.filter((t) => t.id !== labelId));
        toast('Tiffin label removed', 'info');
      },
      markTiffinDay: () => {
        const activeList = employees.filter((e) => e.status === 'active');
        if (activeList.length === 0) {
          toast('No active staff');
          return 0;
        }
        const updatedById = new Map(activeList.map((e) => [e.id, { ...e, tiffinDays: e.tiffinDays + 1 }]));
        setEmployees((prev) => prev.map((e) => updatedById.get(e.id) ?? e));
        updatedById.forEach((e) => persistEmployee(e));
        op(() => saveTiffinEntries(activeList.map((e) => ({ employeeId: e.id, branchId: branchIdFor(e), label: 'Tiffin', amount: tiffinPerDay(e.tiffin), givenBy: sessionLabel(session) }))));
        toast(`Tiffin marked for ${activeList.length} staff today`);
        return activeList.length;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, branches, formulaBlocks, notices, checkins, attendanceMarks, tiffinLabels, session, auditLog, notifications, salaryEntries, firestoreActive],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

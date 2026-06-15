import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type {
  Advance,
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
  ProofFactors,
  ProofMethod,
  QrRotation,
  Session,
  TiffinLabel,
} from '../types';
import { BRANCHES, CHECKINS, EMPLOYEES, FORMULA_BLOCKS, NOTICES } from '../data';
import { buildAttendanceMarks, workedFromMarks, countMark, type Mark } from '../data/attendanceMarks';
import { CURRENT_MONTH } from '../data/month';
import { evaluateEligibility } from '../services/eligibility';
import { allocatePaidLeave } from '../services/leave';
import { evaluateProof, isAutoApproved } from '../services/attendance';
import { useToast } from '../components/ui/Toast';
import { auth, firebaseConfigured } from '../lib/firebase';
import { bulkUpsertBranches, bulkUpsertEmployees, loadBranches, loadEmployees, upsertBranch, upsertEmployee } from '../lib/firestoreRepo';
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

const DEFAULT_SESSION: Session = { role: 'admin', name: 'Indrajit Pal' };

export interface NewEmployeeInput {
  name: string;
  branch: string;
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
  const code = branches.find((b) => b.name === input.branch)?.code ?? input.branch.slice(0, 2).toUpperCase();
  const id = `GNG-${code}-${Math.floor(1000 + Math.random() * 8999)}`;
  return {
    id,
    name: input.name,
    branch: input.branch,
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
  session: Session;
  auditLog: AuditEntry[];

  getEmployee: (id: string) => Employee | undefined;
  getBranch: (id: string) => Branch | undefined;

  /* Session & audit */
  setSession: (session: Session) => void;
  logAudit: (entry: Omit<AuditEntry, 'id' | 'at' | 'by'>) => void;
  overrideEmployeeField: (employeeId: string, field: OverrideField, newValue: number, reason: string) => void;

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
  const [session, setSession] = usePersistentState<Session>('session', DEFAULT_SESSION);
  const [auditLog, setAuditLog] = usePersistentState<AuditEntry[]>('auditLog', []);
  const [notices] = useState<Notice[]>(NOTICES);
  const [firestoreActive, setFirestoreActive] = useState(false);

  // When Firebase is configured and an admin signs in, load branches/employees
  // from Firestore (Firestore becomes the source of truth; local data is the
  // fallback). Errors (e.g. blocked by rules) surface a clear toast.
  useEffect(() => {
    if (!firebaseConfigured || !auth) return;
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirestoreActive(false);
        return;
      }
      try {
        const [fbBranches, fbEmployees] = await Promise.all([loadBranches(), loadEmployees()]);
        if (fbBranches.length) setBranches(fbBranches);
        if (fbEmployees.length) setEmployees(fbEmployees);
        setFirestoreActive(true);
      } catch (err) {
        setFirestoreActive(false);
        toast((err as Error).message, 'error');
      }
    });
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

  const updateEmployee = (employeeId: string, fn: (e: Employee) => Employee) =>
    setEmployees((prev) => prev.map((e) => (e.id === employeeId ? fn(e) : e)));
  const updateBranch = (branchId: string, fn: (b: Branch) => Branch) =>
    setBranches((prev) => prev.map((b) => (b.id === branchId ? fn(b) : b)));
  const randToken = (code: string) => `GNGQR-${code}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

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
      getEmployee: (id) => employees.find((e) => e.id === id),
      getBranch: (id) => branches.find((b) => b.id === id),

      setSession,
      logAudit: (entry) =>
        setAuditLog((prev) => [{ ...entry, id: uid('aud'), at: new Date().toISOString(), by: `${session.name} (${session.role})` }, ...prev]),
      overrideEmployeeField: (employeeId, field, newValue, reason) => {
        const emp = employees.find((e) => e.id === employeeId);
        if (!emp) return;
        const oldValue = emp[field];
        updateEmployee(employeeId, (e) => ({ ...e, [field]: newValue }));
        persistEmployee({ ...emp, [field]: newValue });
        setAuditLog((prev) => [
          { id: uid('aud'), at: new Date().toISOString(), by: `${session.name} (${session.role})`, entity: 'Employee', target: `${emp.name} (${emp.id})`, field: OVERRIDE_FIELDS[field], oldValue: String(oldValue), newValue: String(newValue), reason },
          ...prev,
        ]);
        toast('Override saved to audit log');
      },
      bulkMark: (employeeIds, dayIndex, mark) => {
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
        setEmployees((emps) =>
          emps.map((e) => {
            if (!employeeIds.includes(e.id)) return e;
            const base = attendanceMarks[e.id] ?? Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
            const row = [...base];
            row[dayIndex] = mark;
            return { ...e, worked: workedFromMarks(row), daysPresent: countMark(row, 'P'), daysAbsent: countMark(row, 'A'), daysHalf: countMark(row, 'H'), leaveUsed: countMark(row, 'L') + countMark(row, 'A') };
          }),
        );
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
        updateEmployee(id, (e) => ({ ...e, advances: [{ ...advance, id: uid('adv') }, ...e.advances] }));
        toast('Advance recorded');
      },
      updateAdvance: (id, advanceId, patch) => {
        updateEmployee(id, (e) => ({ ...e, advances: e.advances.map((a) => (a.id === advanceId ? { ...a, ...patch } : a)) }));
        toast('Advance updated');
      },
      adjustAdvancesAgainstSalary: (id) => {
        updateEmployee(id, (e) => ({ ...e, advances: e.advances.map((a) => ({ ...a, cleared: true })) }));
        toast('Advances adjusted against salary');
      },

      /* ---- Payments ---- */
      addPayment: (id, payment) => {
        updateEmployee(id, (e) => ({ ...e, payments: [{ ...payment, id: uid('pay') }, ...e.payments] }));
        toast(`${payment.type} recorded — pending confirmation`);
      },
      updatePaymentStatus: (id, paymentId, status) => {
        updateEmployee(id, (e) => ({ ...e, payments: e.payments.map((p) => (p.id === paymentId ? { ...p, status } : p)) }));
        toast(status === 'confirmed' ? 'Payment confirmed' : status === 'disputed' ? 'Issue raised' : 'Payment updated', status === 'disputed' ? 'info' : 'success');
      },
      setPayrollStatus: (id, status) => {
        updateEmployee(id, (e) => ({ ...e, payrollStatus: status }));
        toast(`Salary ${status}`);
      },
      approveAllPending: () => {
        let n = 0;
        setEmployees((prev) =>
          prev.map((e) => {
            if (e.payrollStatus === 'pending') {
              n++;
              return { ...e, payrollStatus: 'approved' };
            }
            return e;
          }),
        );
        toast(n ? `${n} salaries approved` : 'No pending salaries');
        return n;
      },

      /* ---- Leave ---- */
      setLeaveStatus: (id, leaveId, status) => {
        updateEmployee(id, (e) => recomputeLeavePaidFlags({ ...e, leaves: e.leaves.map((l) => (l.id === leaveId ? { ...l, status } : l)) }));
        toast(status === 'approved' ? 'Leave approved' : 'Leave rejected', status === 'approved' ? 'success' : 'info');
      },
      addLeaveRequest: (id, leave) => {
        updateEmployee(id, (e) => recomputeLeavePaidFlags({ ...e, leaves: [...e.leaves, { ...leave, id: uid('leave'), paid: false }] }));
        toast('Leave requested');
      },

      /* ---- Attendance ---- */
      setAttendanceMark: (employeeId, dayIndex, mark) => {
        const base = attendanceMarks[employeeId] ?? Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
        const row = [...base];
        row[dayIndex] = mark;
        setAttendanceMarks((prev) => ({ ...prev, [employeeId]: row }));
        // keep the employee's worked / leave figures in sync with the grid
        setEmployees((emps) =>
          emps.map((e) =>
            e.id === employeeId
              ? { ...e, worked: workedFromMarks(row), daysPresent: countMark(row, 'P'), daysAbsent: countMark(row, 'A'), daysHalf: countMark(row, 'H'), leaveUsed: countMark(row, 'L') + countMark(row, 'A') }
              : e,
          ),
        );
      },

      addCheckin: (input) => {
        const branch = branches.find((b) => b.name === input.branch);
        const strength = evaluateProof(input.factors);
        const approved = branch ? isAutoApproved(branch, input.factors) : false;
        const record: AttendanceRecord = { id: uid('chk'), date: '14 Mar 2026', strength, approved, ...input };
        setCheckins((prev) => [record, ...prev]);
        return { strength, approved };
      },
      approveCheckin: (id) => {
        setCheckins((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const factors = { ...c.factors, managerApproved: true };
            return { ...c, factors, strength: evaluateProof(factors), approved: true };
          }),
        );
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
        let n = 0;
        setEmployees((prev) =>
          prev.map((e) => {
            if (e.status === 'active') {
              n++;
              return { ...e, tiffinDays: e.tiffinDays + 1 };
            }
            return e;
          }),
        );
        toast(n ? `Tiffin marked for ${n} staff today` : 'No active staff');
        return n;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, branches, formulaBlocks, notices, checkins, attendanceMarks, tiffinLabels, session, auditLog, firestoreActive],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

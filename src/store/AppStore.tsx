import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type {
  Advance,
  AttendanceRecord,
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
  TiffinLabel,
} from '../types';
import { BRANCHES, CHECKINS, EMPLOYEES, FORMULA_BLOCKS, NOTICES } from '../data';
import { buildAttendanceMarks, workedFromMarks, countMark, type Mark } from '../data/attendanceMarks';
import { CURRENT_MONTH } from '../data/month';
import { evaluateEligibility } from '../services/eligibility';
import { allocatePaidLeave } from '../services/leave';
import { evaluateProof, isAutoApproved } from '../services/attendance';
import { useToast } from '../components/ui/Toast';

/** Company-wide default tiffin labels (used as defaults + the Tiffin module list). */
const DEFAULT_TIFFIN_LABELS: TiffinLabel[] = [
  { id: 'tl-breakfast', label: 'Breakfast', amount: 60 },
  { id: 'tl-lunch', label: 'Lunch / Dinner', amount: 100 },
];

interface AppContextValue {
  employees: Employee[];
  branches: Branch[];
  formulaBlocks: FormulaBlock[];
  notices: Notice[];
  checkins: AttendanceRecord[];
  attendanceMarks: Record<string, Mark[]>;
  tiffinLabels: TiffinLabel[];

  getEmployee: (id: string) => Employee | undefined;
  getBranch: (id: string) => Branch | undefined;

  /* Employees */
  addEmployee: (input: { name: string; branch: string; role: string; salary: number; basis: Employee['basis']; joined: string; phone?: string; email?: string }) => void;
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
  const [notices] = useState<Notice[]>(NOTICES);

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
      getEmployee: (id) => employees.find((e) => e.id === id),
      getBranch: (id) => branches.find((b) => b.id === id),

      /* ---- Employees ---- */
      addEmployee: (input) => {
        const branch = branches.find((b) => b.name === input.branch);
        const code = branch?.code ?? 'GN';
        const id = `GNG-${code}-${Math.floor(1000 + Math.random() * 8999)}`;
        const emp: Employee = {
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
        setEmployees((prev) => [emp, ...prev]);
        setAttendanceMarks((prev) => ({ ...prev, [id]: Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark) }));
        toast(`${input.name} added`);
      },

      updateEmployeeProfile: (id, patch) => {
        updateEmployee(id, (e) => ({ ...e, ...patch }));
        toast('Employee updated');
      },

      setEmployeeStatus: (id, status) => {
        updateEmployee(id, (e) => recomputeLeavePaidFlags({ ...e, status }));
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
        updateBranch(branchId, (b) => ({ ...b, qr: { ...b.qr, token: randToken(b.code), status: 'active', generatedAt: '14 Mar 2026' } }));
        toast('QR rotated — old code is now invalid');
      },
      updateBranchQrRotation: (branchId, rotation) => updateBranch(branchId, (b) => ({ ...b, qr: { ...b.qr, rotation } })),
      updateBranchGeofence: (branchId, patch) => updateBranch(branchId, (b) => ({ ...b, geofence: { ...b.geofence, ...patch } })),

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
    [employees, branches, formulaBlocks, notices, checkins, attendanceMarks, tiffinLabels],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

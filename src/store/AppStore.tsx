import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  Advance,
  AttendanceRecord,
  Branch,
  BranchGeofence,
  ConfirmationStatus,
  Employee,
  FormulaBlock,
  LeaveRequest,
  Notice,
  Payment,
  ProofFactors,
  ProofMethod,
  QrRotation,
} from '../types';
import { BRANCHES, CHECKINS, EMPLOYEES, FORMULA_BLOCKS, NOTICES } from '../data';
import { evaluateEligibility } from '../services/eligibility';
import { allocatePaidLeave } from '../services/leave';
import { evaluateProof, isAutoApproved } from '../services/attendance';

/**
 * In-memory application store. All mutations flow through these actions so the
 * UI stays logically connected (a recorded payment shows up in Payments and in
 * the employee portal's pending confirmations, etc.). Swap this for a backend
 * client later without touching the screens.
 */
interface AppContextValue {
  employees: Employee[];
  branches: Branch[];
  formulaBlocks: FormulaBlock[];
  notices: Notice[];
  checkins: AttendanceRecord[];

  getEmployee: (id: string) => Employee | undefined;
  getBranch: (id: string) => Branch | undefined;
  addCheckin: (input: { employeeId: string; employeeName: string; branch: string; method: ProofMethod; factors: ProofFactors; time: string }) => void;
  approveCheckin: (id: string) => void;
  rotateBranchQr: (branchId: string) => void;
  updateBranchQrRotation: (branchId: string, rotation: QrRotation) => void;
  updateBranchGeofence: (branchId: string, patch: Partial<BranchGeofence>) => void;
  addAdvance: (employeeId: string, advance: Omit<Advance, 'id'>) => void;
  addPayment: (employeeId: string, payment: Omit<Payment, 'id'>) => void;
  updatePaymentStatus: (employeeId: string, paymentId: string, status: ConfirmationStatus) => void;
  setLeaveStatus: (employeeId: string, leaveId: string, status: 'approved' | 'rejected') => void;
  addLeaveRequest: (employeeId: string, leave: Omit<LeaveRequest, 'id' | 'paid'>) => void;
  setEmployeeLogin: (employeeId: string, enabled: boolean) => void;
  setEmployeeBasis: (employeeId: string, basis: Employee['basis']) => void;
  saveFormulaBlock: (block: FormulaBlock) => void;
  toggleFormulaBlock: (blockId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Recompute each leave's paid/unpaid flag from eligibility + the 4-day bucket. */
function recomputeLeavePaidFlags(employee: Employee): Employee {
  const { freeLeaveAllowed } = evaluateEligibility({
    tenureMonths: employee.tenureMonths,
    workedDays: employee.worked,
    status: employee.status,
  });
  const allocations = allocatePaidLeave(
    employee.leaves.map((l) => ({ days: l.days, status: l.status })),
    freeLeaveAllowed,
  );
  return {
    ...employee,
    leaves: employee.leaves.map((l, i) => ({ ...l, paid: l.status === 'rejected' ? false : allocations[i].paid })),
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(EMPLOYEES);
  const [branches, setBranches] = useState<Branch[]>(BRANCHES);
  const [formulaBlocks, setFormulaBlocks] = useState<FormulaBlock[]>(FORMULA_BLOCKS);
  const [notices] = useState<Notice[]>(NOTICES);
  const [checkins, setCheckins] = useState<AttendanceRecord[]>(CHECKINS);

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
      getEmployee: (id) => employees.find((e) => e.id === id),
      getBranch: (id) => branches.find((b) => b.id === id),

      rotateBranchQr: (branchId) =>
        updateBranch(branchId, (b) => ({ ...b, qr: { ...b.qr, token: randToken(b.code), status: 'active', generatedAt: '14 Mar 2026' } })),

      updateBranchQrRotation: (branchId, rotation) =>
        updateBranch(branchId, (b) => ({ ...b, qr: { ...b.qr, rotation } })),

      updateBranchGeofence: (branchId, patch) =>
        updateBranch(branchId, (b) => ({ ...b, geofence: { ...b.geofence, ...patch } })),

      addCheckin: (input) =>
        setCheckins((prev) => {
          const branch = branches.find((b) => b.name === input.branch);
          const strength = evaluateProof(input.factors);
          const record: AttendanceRecord = {
            id: uid('chk'),
            employeeId: input.employeeId,
            employeeName: input.employeeName,
            branch: input.branch,
            date: '14 Mar 2026',
            time: input.time,
            method: input.method,
            factors: input.factors,
            strength,
            approved: branch ? isAutoApproved(branch, input.factors) : false,
          };
          return [record, ...prev];
        }),

      approveCheckin: (id) =>
        setCheckins((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            const factors = { ...c.factors, managerApproved: true };
            return { ...c, factors, strength: evaluateProof(factors), approved: true };
          }),
        ),

      addAdvance: (employeeId, advance) =>
        updateEmployee(employeeId, (e) => ({ ...e, advances: [{ ...advance, id: uid('adv') }, ...e.advances] })),

      addPayment: (employeeId, payment) =>
        updateEmployee(employeeId, (e) => ({ ...e, payments: [{ ...payment, id: uid('pay') }, ...e.payments] })),

      updatePaymentStatus: (employeeId, paymentId, status) =>
        updateEmployee(employeeId, (e) => ({
          ...e,
          payments: e.payments.map((p) => (p.id === paymentId ? { ...p, status } : p)),
        })),

      setLeaveStatus: (employeeId, leaveId, status) =>
        updateEmployee(employeeId, (e) =>
          recomputeLeavePaidFlags({
            ...e,
            leaves: e.leaves.map((l) => (l.id === leaveId ? { ...l, status } : l)),
          }),
        ),

      addLeaveRequest: (employeeId, leave) =>
        updateEmployee(employeeId, (e) =>
          recomputeLeavePaidFlags({ ...e, leaves: [...e.leaves, { ...leave, id: uid('leave'), paid: false }] }),
        ),

      setEmployeeLogin: (employeeId, enabled) =>
        updateEmployee(employeeId, (e) => ({ ...e, login: enabled ? 'enabled' : 'disabled' })),

      setEmployeeBasis: (employeeId, basis) => updateEmployee(employeeId, (e) => ({ ...e, basis })),

      saveFormulaBlock: (block) =>
        setFormulaBlocks((prev) => {
          const exists = prev.some((b) => b.id === block.id);
          return exists ? prev.map((b) => (b.id === block.id ? block : b)) : [block, ...prev];
        }),

      toggleFormulaBlock: (blockId) =>
        setFormulaBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, active: !b.active } : b))),
    }),
    [employees, branches, formulaBlocks, notices, checkins],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

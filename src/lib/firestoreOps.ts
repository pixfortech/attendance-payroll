/* ============================================================
   Firestore repository for OPERATIONAL payroll data (Phase 2).

   This module owns the nine normalised collections that make the app work
   cross-device:

     attendance · salaryRuns · salaryEntries · advances · advanceAdjustments
     payments · tiffinEntries · notifications · auditLogs

   Design notes
   ------------
   - The in-memory store (AppStore) remains the model the UI renders. These
     functions WRITE THROUGH each operational mutation to Firestore and HYDRATE
     the store on admin sign-in, so Firestore is the source of truth and
     localStorage is only the demo/offline fallback.
   - Every write is keyed by a stable id, so re-marking/re-approving updates the
     same document instead of creating duplicates.
   - No PIN or secret is ever written here (same rule as employees/branches).
   - All functions no-op when `db` is undefined (demo mode) and surface a
     normalised error otherwise, so callers can show a single clear toast.

   TODO(security): these collections are currently gated by the single
   Master-Admin UID rule. When employee/manager backend auth lands, tighten
   `firestore.rules` with role-based / custom-claim checks (e.g. an employee may
   read only their own attendance / payments / notifications).
   ============================================================ */
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { CURRENT_MONTH } from '../data/month';
import type { Mark } from '../data/attendanceMarks';
import type {
  Advance,
  AppNotification,
  AttendanceRecord,
  AuditEntry,
  Branch,
  Employee,
  Payment,
  PaymentType,
  ProofFactors,
  ProofStrength,
  Role,
  SalaryEntry,
  SalaryStatus,
} from '../types';

export class FirestoreUnavailable extends Error {}
export class FirestoreBlocked extends Error {}

function normalise(err: unknown): Error {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'permission-denied' || code === 'unauthenticated') {
    return new FirestoreBlocked('Firestore access is blocked by security rules. Check the Master Admin UID in your rules.');
  }
  return new FirestoreUnavailable('Firestore is unavailable — using local data for now.');
}

/** Strip `undefined` (Firestore rejects it). `null` is preserved. */
function clean<T extends Record<string, unknown>>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const nowIso = () => new Date().toISOString();
const isoToday = () => new Date().toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, '0');

/* ============================================================
   Mappers (pure — unit-tested without Firebase)
   ============================================================ */

export type AttendanceStatus = 'present' | 'absent' | 'half' | 'leave' | 'off';

const MARK_TO_STATUS: Record<Mark, AttendanceStatus> = { P: 'present', A: 'absent', H: 'half', L: 'leave', O: 'off' };
const STATUS_TO_MARK: Record<AttendanceStatus, Mark> = { present: 'P', absent: 'A', half: 'H', leave: 'L', off: 'O' };

export const markToStatus = (m: Mark): AttendanceStatus => MARK_TO_STATUS[m] ?? 'off';
export const statusToMark = (s: string): Mark => STATUS_TO_MARK[s as AttendanceStatus] ?? 'O';

/** A grid cell's stable date string. Working-day index → an anchored date in
 *  the running month (index 0 → day 01). Stable so re-marking upserts. */
export const dayIndexToDate = (i: number): string => `${CURRENT_MONTH.year}-${pad(CURRENT_MONTH.month)}-${pad(i + 1)}`;
export const dateToDayIndex = (date: string): number => {
  const day = Number((date.split('-')[2] ?? '').slice(0, 2));
  return Number.isFinite(day) && day > 0 ? day - 1 : -1;
};

export type PaymentDocType = 'salary' | 'advance' | 'tiffin' | 'bonus' | 'other';
const PAYMENT_TYPE_TO_DOC: Record<PaymentType, PaymentDocType> = {
  Salary: 'salary',
  Advance: 'advance',
  'Tiffin (CTC)': 'tiffin',
  Bonus: 'bonus',
  Incentive: 'bonus',
  'Deduction adjustment': 'other',
  Other: 'other',
};
export const paymentTypeToDoc = (t: PaymentType): PaymentDocType => PAYMENT_TYPE_TO_DOC[t] ?? 'other';

export type PaymentDocStatus = 'pending_confirmation' | 'confirmed' | 'disputed';
export const paymentStatusToDoc = (s: Payment['status']): PaymentDocStatus =>
  s === 'confirmed' ? 'confirmed' : s === 'disputed' ? 'disputed' : 'pending_confirmation';

const SALARY_STATUS_TO_DOC: Record<SalaryStatus, SalaryEntry['status']> = {
  notstarted: 'not_started',
  requested: 'request_received',
  pending: 'pending',
  approved: 'approved',
  paid: 'paid',
  hold: 'on_hold',
};
export const salaryStatusToDoc = (s: SalaryStatus): SalaryEntry['status'] => SALARY_STATUS_TO_DOC[s] ?? 'pending';

/* ---------- Notifications ---------- */
export function notificationToDoc(n: AppNotification): Record<string, unknown> {
  return clean({
    id: n.id,
    recipientRole: n.recipient.role ?? null,
    recipientEmployeeId: n.recipient.employeeId ?? null,
    recipientUserId: null, // TODO(auth): set when employees/managers get backend users
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    relatedEntityType: n.relatedId ? 'employee' : null,
    relatedEntityId: n.relatedId ?? null,
    createdAt: n.createdAt,
  });
}
export function notificationFromDoc(d: Record<string, unknown>): AppNotification {
  return {
    id: String(d.id),
    recipient: {
      role: (d.recipientRole as Role | null) ?? undefined,
      employeeId: (d.recipientEmployeeId as string | null) ?? undefined,
    },
    type: d.type as AppNotification['type'],
    title: String(d.title ?? ''),
    message: String(d.message ?? ''),
    read: Boolean(d.read),
    createdAt: String(d.createdAt ?? nowIso()),
    relatedId: (d.relatedEntityId as string | null) ?? undefined,
  };
}

/* ---------- Audit logs ---------- */
export function auditToDoc(a: AuditEntry): Record<string, unknown> {
  return clean({
    id: a.id,
    action: a.field,
    entityType: a.entity,
    entityId: a.target,
    oldValue: a.oldValue,
    newValue: a.newValue,
    changedBy: a.by,
    reason: a.reason ?? null,
    createdAt: a.at,
  });
}
export function auditFromDoc(d: Record<string, unknown>): AuditEntry {
  return {
    id: String(d.id),
    at: String(d.createdAt ?? nowIso()),
    by: String(d.changedBy ?? 'System'),
    entity: String(d.entityType ?? ''),
    target: String(d.entityId ?? ''),
    field: String(d.action ?? ''),
    oldValue: String(d.oldValue ?? ''),
    newValue: String(d.newValue ?? ''),
    reason: (d.reason as string | null) ?? undefined,
  };
}

/* ---------- Attendance ---------- */
function gridMarkDoc(args: { employeeId: string; branchId: string; dayIndex: number; mark: Mark; by: string; method: 'manual' | 'manager' }): Record<string, unknown> {
  const date = dayIndexToDate(args.dayIndex);
  const now = nowIso();
  return clean({
    id: `mark-${args.employeeId}-${date}`,
    employeeId: args.employeeId,
    branchId: args.branchId || null,
    date,
    status: markToStatus(args.mark),
    checkInTime: null,
    checkOutTime: null,
    method: args.method,
    proofStatus: 'strong', // admin/manager grid entry is authoritative
    approvalStatus: 'approved',
    managerApprovedBy: args.by || null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  });
}

function checkinDoc(rec: AttendanceRecord, branchId: string): Record<string, unknown> {
  const now = nowIso();
  return clean({
    id: rec.id,
    employeeId: rec.employeeId,
    branchId: branchId || null,
    date: isoToday(),
    status: 'present',
    checkInTime: rec.time,
    checkOutTime: null,
    method: rec.method,
    proofStatus: rec.strength,
    approvalStatus: rec.approved ? 'approved' : 'pending',
    managerApprovedBy: rec.factors.managerApproved ? 'manager' : null,
    notes: null,
    // Denormalised so the proof view / portal can be reconstructed faithfully.
    employeeName: rec.employeeName,
    branchName: rec.branch,
    dateLabel: rec.date,
    factors: rec.factors,
    createdAt: now,
    updatedAt: now,
  });
}

/** Rebuild the month grid + the (today's) check-in feed from raw attendance
 *  docs. Grid marks are month-anchored and always returned; check-ins are
 *  scoped to `today` so the dashboard's "present today" stays accurate. */
export function hydrateAttendance(
  docs: Record<string, unknown>[],
  employees: Employee[],
  branches: Branch[],
  today: string = isoToday(),
): { marks: Record<string, Mark[]>; checkins: AttendanceRecord[] } {
  const marks: Record<string, Mark[]> = {};
  const checkinDocs = docs.filter((d) => d.checkInTime && String(d.date ?? '').slice(0, 10) === today);
  const markDocs = docs.filter((d) => !d.checkInTime);

  for (const d of markDocs) {
    const idx = dateToDayIndex(String(d.date ?? ''));
    if (idx < 0 || idx >= CURRENT_MONTH.workingDays) continue;
    const empId = String(d.employeeId);
    if (!marks[empId]) marks[empId] = Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
    marks[empId][idx] = statusToMark(String(d.status ?? 'off'));
  }

  const checkins: AttendanceRecord[] = checkinDocs
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .map((d) => {
      const factors = (d.factors as ProofFactors | undefined) ?? {
        qrMatched: false,
        gpsInsideRadius: false,
        wifiMatched: false,
        selfieCaptured: false,
        managerApproved: d.approvalStatus === 'approved',
      };
      return {
        id: String(d.id),
        employeeId: String(d.employeeId),
        employeeName: String(d.employeeName ?? employees.find((e) => e.id === d.employeeId)?.name ?? d.employeeId),
        branch: String(d.branchName ?? branches.find((b) => b.id === d.branchId)?.name ?? ''),
        date: String(d.dateLabel ?? d.date ?? ''),
        time: String(d.checkInTime ?? ''),
        method: d.method as AttendanceRecord['method'],
        factors,
        strength: (d.proofStatus as ProofStrength) ?? 'needs_approval',
        approved: d.approvalStatus === 'approved',
      };
    });

  return { marks, checkins };
}

/* ============================================================
   Writes (no-op in demo; normalised errors otherwise)
   ============================================================ */

export async function saveAttendanceMark(args: { employeeId: string; branchId: string; dayIndex: number; mark: Mark; by: string }): Promise<void> {
  if (!db) return;
  try {
    const d = gridMarkDoc({ ...args, method: 'manual' });
    await setDoc(doc(db, 'attendance', d.id as string), d);
  } catch (err) {
    throw normalise(err);
  }
}

export async function saveAttendanceMarksBulk(args: { employeeIds: string[]; branchId: string; dayIndex: number; mark: Mark; by: string }): Promise<void> {
  if (!db || args.employeeIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const employeeId of args.employeeIds) {
      const d = gridMarkDoc({ employeeId, branchId: args.branchId, dayIndex: args.dayIndex, mark: args.mark, by: args.by, method: 'manager' });
      batch.set(doc(db, 'attendance', d.id as string), d);
    }
    await batch.commit();
  } catch (err) {
    throw normalise(err);
  }
}

export async function saveCheckin(rec: AttendanceRecord, branchId: string): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'attendance', rec.id), checkinDoc(rec, branchId));
  } catch (err) {
    throw normalise(err);
  }
}

export async function loadAttendance(): Promise<Record<string, unknown>[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'attendance'));
    return snap.docs.map((d) => d.data());
  } catch (err) {
    throw normalise(err);
  }
}

/* ---------- Salary runs + entries ---------- */
export interface SalaryRunCounts {
  status: 'open' | 'closed';
  approvedCount: number;
  paidCount: number;
  pendingCount: number;
}
export const salaryRunId = (year = CURRENT_MONTH.year, month = CURRENT_MONTH.month) => `run-${year}-${pad(month)}`;

export async function saveSalaryRun(counts: SalaryRunCounts): Promise<void> {
  if (!db) return;
  const now = nowIso();
  try {
    await setDoc(
      doc(db, 'salaryRuns', salaryRunId()),
      { id: salaryRunId(), month: CURRENT_MONTH.month, year: CURRENT_MONTH.year, ...counts, updatedAt: now, createdAt: now },
      { merge: true },
    );
  } catch (err) {
    throw normalise(err);
  }
}

export async function saveSalaryEntry(entry: SalaryEntry): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'salaryEntries', entry.id), clean({ ...entry, paymentId: entry.paymentId ?? null, approvedAt: entry.approvedAt ?? null, paidAt: entry.paidAt ?? null }));
  } catch (err) {
    throw normalise(err);
  }
}

export async function loadSalaryEntries(): Promise<SalaryEntry[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'salaryEntries'));
    return snap.docs.map((d) => d.data() as SalaryEntry);
  } catch (err) {
    throw normalise(err);
  }
}

/* ---------- Advances + adjustments ---------- */
export async function saveAdvance(employeeId: string, a: Advance, remainingBalance: number): Promise<void> {
  if (!db) return;
  const now = nowIso();
  try {
    await setDoc(
      doc(db, 'advances', a.id),
      clean({
        id: a.id,
        employeeId,
        amount: a.amount,
        date: a.date,
        paymentMethod: a.method,
        referenceNumber: a.ref ?? null,
        notes: a.note && a.note !== '—' ? a.note : null,
        repaymentPlan: a.plan ?? null,
        remainingBalance,
        status: a.cleared ? 'cleared' : 'active',
        createdAt: now,
        updatedAt: now,
      }),
      { merge: true },
    );
  } catch (err) {
    throw normalise(err);
  }
}

export interface AdvanceAdjustmentInput {
  id: string;
  advanceId: string;
  employeeId: string;
  salaryEntryId: string;
  amountAdjusted: number;
  remainingBalance: number;
  adjustedBy: string;
  notes?: string;
}
export async function saveAdvanceAdjustment(adj: AdvanceAdjustmentInput): Promise<void> {
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'advanceAdjustments', adj.id),
      clean({
        id: adj.id,
        advanceId: adj.advanceId,
        employeeId: adj.employeeId,
        salaryEntryId: adj.salaryEntryId,
        month: CURRENT_MONTH.month,
        year: CURRENT_MONTH.year,
        amountAdjusted: adj.amountAdjusted,
        remainingBalance: adj.remainingBalance,
        adjustedAt: nowIso(),
        adjustedBy: adj.adjustedBy,
        notes: adj.notes ?? null,
      }),
    );
  } catch (err) {
    throw normalise(err);
  }
}

/* ---------- Payments ---------- */
export async function savePayment(employeeId: string, p: Payment): Promise<void> {
  if (!db) return;
  const now = nowIso();
  try {
    await setDoc(
      doc(db, 'payments', p.id),
      clean({
        id: p.id,
        employeeId,
        type: paymentTypeToDoc(p.type),
        amount: p.amount,
        paymentMethod: p.method,
        referenceNumber: p.ref ?? null,
        paymentDate: p.date,
        period: p.period,
        status: paymentStatusToDoc(p.status),
        receiptMeta: p.receipt ?? null,
        confirmedAt: p.status === 'confirmed' ? now : null,
        disputedAt: p.status === 'disputed' ? now : null,
        notes: p.note && p.note !== '—' ? p.note : null,
        createdAt: now,
        updatedAt: now,
      }),
      { merge: true },
    );
  } catch (err) {
    throw normalise(err);
  }
}

export async function updatePaymentStatusDoc(paymentId: string, status: Payment['status']): Promise<void> {
  if (!db) return;
  const now = nowIso();
  try {
    await updateDoc(doc(db, 'payments', paymentId), {
      status: paymentStatusToDoc(status),
      updatedAt: now,
      ...(status === 'confirmed' ? { confirmedAt: now } : {}),
      ...(status === 'disputed' ? { disputedAt: now } : {}),
    });
  } catch (err) {
    throw normalise(err);
  }
}

/* ---------- Tiffin entries ---------- */
export interface TiffinEntryInput {
  employeeId: string;
  branchId: string;
  label: string;
  amount: number;
  givenBy: string;
  notes?: string;
}
export async function saveTiffinEntries(entries: TiffinEntryInput[]): Promise<void> {
  if (!db || entries.length === 0) return;
  const date = isoToday();
  const now = nowIso();
  try {
    const batch = writeBatch(db);
    for (const e of entries) {
      const id = `tif-${e.employeeId}-${date}`;
      batch.set(
        doc(db, 'tiffinEntries', id),
        clean({ id, employeeId: e.employeeId, branchId: e.branchId || null, date, label: e.label, amount: e.amount, givenBy: e.givenBy, notes: e.notes ?? null, createdAt: now, updatedAt: now }),
      );
    }
    await batch.commit();
  } catch (err) {
    throw normalise(err);
  }
}

/* ---------- Notifications (real-time) ---------- */
export async function saveNotification(n: AppNotification): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'notifications', n.id), notificationToDoc(n));
  } catch (err) {
    throw normalise(err);
  }
}

export async function setNotificationRead(id: string, read: boolean): Promise<void> {
  if (!db) return;
  try {
    await updateDoc(doc(db, 'notifications', id), { read });
  } catch (err) {
    throw normalise(err);
  }
}

export async function setNotificationsRead(ids: string[]): Promise<void> {
  if (!db || ids.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const id of ids) batch.update(doc(db, 'notifications', id), { read: true });
    await batch.commit();
  } catch (err) {
    throw normalise(err);
  }
}

/** Live subscription used to drive the notification bell. Returns an
 *  unsubscribe (a no-op in demo mode). */
export function subscribeNotifications(cb: (list: AppNotification[]) => void): () => void {
  if (!db) return () => {};
  return onSnapshot(
    collection(db, 'notifications'),
    (snap) => {
      const list = snap.docs
        .map((d) => notificationFromDoc(d.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      cb(list);
    },
    () => {/* permission/availability errors fall back to local state */},
  );
}

/* ---------- Audit logs ---------- */
export async function saveAuditLog(entry: AuditEntry): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'auditLogs', entry.id), auditToDoc(entry));
  } catch (err) {
    throw normalise(err);
  }
}

export async function loadAuditLogs(): Promise<AuditEntry[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'auditLogs'));
    return snap.docs.map((d) => auditFromDoc(d.data())).sort((a, b) => b.at.localeCompare(a.at));
  } catch (err) {
    throw normalise(err);
  }
}

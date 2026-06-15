/* ============================================================
   Firestore repository for branches & employees.

   Documents are keyed by their id. The full Employee/Branch object is stored
   (no PIN is ever written — PIN/role login stays local/demo). Reads/writes
   throw normalised errors so the UI can show a clear "blocked by rules" notice.
   ============================================================ */
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Branch, Employee } from '../types';

export class FirestoreUnavailable extends Error {}
export class FirestoreBlocked extends Error {}

function normalise(err: unknown): Error {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'permission-denied' || code === 'unauthenticated') {
    return new FirestoreBlocked('Firestore access is blocked by security rules. Check the Master Admin UID in your rules.');
  }
  return new FirestoreUnavailable('Firestore is unavailable — using local data for now.');
}

/** Strip `undefined` (Firestore rejects it) and drop any client-only secrets. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export async function loadEmployees(): Promise<Employee[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'employees'));
    return snap.docs.map((d) => d.data() as Employee);
  } catch (err) {
    throw normalise(err);
  }
}

export async function loadBranches(): Promise<Branch[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'branches'));
    return snap.docs.map((d) => d.data() as Branch);
  } catch (err) {
    throw normalise(err);
  }
}

export async function upsertEmployee(employee: Employee): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'employees', employee.id), clean(employee));
  } catch (err) {
    throw normalise(err);
  }
}

export async function upsertBranch(branch: Branch): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'branches', branch.id), clean(branch));
  } catch (err) {
    throw normalise(err);
  }
}

export async function bulkUpsertEmployees(employees: Employee[]): Promise<void> {
  if (!db || employees.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const e of employees) batch.set(doc(db, 'employees', e.id), clean(e));
    await batch.commit();
  } catch (err) {
    throw normalise(err);
  }
}

export async function bulkUpsertBranches(branches: Branch[]): Promise<void> {
  if (!db || branches.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const b of branches) batch.set(doc(db, 'branches', b.id), clean(b));
    await batch.commit();
  } catch (err) {
    throw normalise(err);
  }
}

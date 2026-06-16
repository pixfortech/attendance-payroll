/* ============================================================
   Offline attendance pending-sync queue (Phase 3B)

   When a Firestore attendance write fails (or the device is offline) the action
   is queued locally and retried when back online. Items are keyed by a
   deterministic id so re-queuing the same employee+day replaces rather than
   duplicates — "duplicate sync does not double-count".
   ============================================================ */
import type { PendingAttendance } from '../types';

/** Deterministic queue/document id for an attendance write. */
export function pendingId(employeeId: string, date: string, source: string): string {
  return `${employeeId}_${date}_${source}`;
}

/** Add (or replace) a pending item, de-duplicated by id. */
export function enqueuePending(queue: PendingAttendance[], item: PendingAttendance): PendingAttendance[] {
  const i = queue.findIndex((q) => q.id === item.id);
  if (i < 0) return [...queue, item];
  const next = [...queue];
  // Preserve the existing retry/error history on replace.
  next[i] = { ...item, retryCount: queue[i].retryCount, lastError: queue[i].lastError };
  return next;
}

export interface SyncOutcome {
  synced: number;
  failed: number;
  queue: PendingAttendance[];
}

/** Try to flush the queue. Successful items are dropped; failures stay with an
 *  incremented retryCount + lastError. Writer must be idempotent (same id ⇒
 *  same document) so retries never double-count. */
export async function syncPending(
  queue: PendingAttendance[],
  writer: (item: PendingAttendance) => Promise<void>,
): Promise<SyncOutcome> {
  let synced = 0;
  let failed = 0;
  const remaining: PendingAttendance[] = [];
  for (const item of queue) {
    try {
      await writer(item);
      synced += 1;
    } catch (err) {
      failed += 1;
      remaining.push({ ...item, retryCount: item.retryCount + 1, lastError: (err as Error).message, updatedAt: new Date().toISOString() });
    }
  }
  return { synced, failed, queue: remaining };
}

export const pendingCount = (queue: PendingAttendance[]): number => queue.length;
export const failedItems = (queue: PendingAttendance[]): PendingAttendance[] => queue.filter((i) => i.retryCount > 0);

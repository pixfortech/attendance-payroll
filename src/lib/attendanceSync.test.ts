import { describe, it, expect } from 'vitest';
import { enqueuePending, failedItems, pendingCount, pendingId, syncPending } from './attendanceSync';
import type { PendingAttendance } from '../types';

const item = (o?: Partial<PendingAttendance>): PendingAttendance => ({
  id: pendingId('E1', '2026-03-01', 'gps'), employeeId: 'E1', employeeCode: 'E1', branchId: 'BR-BD', branchCode: 'BD',
  date: '2026-03-01', attendanceType: 'gps', source: 'gps', timestamp: '9:00', createdBy: 'Admin', retryCount: 0,
  lastError: null, createdAt: '', updatedAt: '', ...o,
});

describe('attendance pending-sync queue', () => {
  it('enqueues and de-dupes by deterministic id', () => {
    let q: PendingAttendance[] = [];
    q = enqueuePending(q, item());
    q = enqueuePending(q, item()); // same employee+day+source → replace
    expect(pendingCount(q)).toBe(1);
    q = enqueuePending(q, item({ id: pendingId('E2', '2026-03-01', 'gps'), employeeId: 'E2' }));
    expect(pendingCount(q)).toBe(2);
  });

  it('syncs successfully and clears the queue', async () => {
    const q = enqueuePending([], item());
    const out = await syncPending(q, async () => {});
    expect(out.synced).toBe(1);
    expect(out.failed).toBe(0);
    expect(out.queue).toHaveLength(0);
  });

  it('keeps failures with retry++ and lastError; retry does not double-count', async () => {
    const q = enqueuePending([], item());
    const out = await syncPending(q, async () => {
      throw new Error('offline');
    });
    expect(out.failed).toBe(1);
    expect(out.queue).toHaveLength(1);
    expect(out.queue[0].retryCount).toBe(1);
    expect(out.queue[0].lastError).toBe('offline');
    expect(failedItems(out.queue)).toHaveLength(1);
    // A later successful retry leaves a single (now-synced) item → empty queue.
    const out2 = await syncPending(out.queue, async () => {});
    expect(out2.queue).toHaveLength(0);
  });
});

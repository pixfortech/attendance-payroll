import { describe, it, expect } from 'vitest';
import {
  auditFromDoc,
  auditToDoc,
  dateToDayIndex,
  dayIndexToDate,
  hydrateAttendance,
  markToStatus,
  notificationFromDoc,
  notificationToDoc,
  paymentTypeToDoc,
  salaryStatusToDoc,
  statusToMark,
} from './firestoreOps';
import type { AppNotification, AuditEntry, Branch, Employee } from '../types';

describe('attendance mark <-> status mapping', () => {
  it('round-trips every mark', () => {
    for (const [mark, status] of [['P', 'present'], ['A', 'absent'], ['H', 'half'], ['L', 'leave'], ['O', 'off']] as const) {
      expect(markToStatus(mark)).toBe(status);
      expect(statusToMark(status)).toBe(mark);
    }
  });
  it('day index <-> date round-trips', () => {
    expect(dayIndexToDate(0)).toBe('2026-03-01');
    expect(dayIndexToDate(25)).toBe('2026-03-26');
    expect(dateToDayIndex('2026-03-01')).toBe(0);
    expect(dateToDayIndex('2026-03-26')).toBe(25);
  });
});

describe('document type mappings', () => {
  it('maps payment types to the Firestore vocabulary', () => {
    expect(paymentTypeToDoc('Salary')).toBe('salary');
    expect(paymentTypeToDoc('Advance')).toBe('advance');
    expect(paymentTypeToDoc('Tiffin (CTC)')).toBe('tiffin');
    expect(paymentTypeToDoc('Bonus')).toBe('bonus');
    expect(paymentTypeToDoc('Other')).toBe('other');
  });
  it('maps derived salary status to the Firestore vocabulary', () => {
    expect(salaryStatusToDoc('notstarted')).toBe('not_started');
    expect(salaryStatusToDoc('requested')).toBe('request_received');
    expect(salaryStatusToDoc('hold')).toBe('on_hold');
    expect(salaryStatusToDoc('approved')).toBe('approved');
    expect(salaryStatusToDoc('paid')).toBe('paid');
  });
});

describe('notification doc round-trip', () => {
  it('preserves recipient + content', () => {
    const n: AppNotification = { id: 'n1', recipient: { employeeId: 'E1' }, type: 'salary_paid', title: 'Paid', message: 'done', read: false, createdAt: '2026-03-01T00:00:00.000Z', relatedId: 'E1' };
    const back = notificationFromDoc(notificationToDoc(n));
    expect(back.id).toBe('n1');
    expect(back.recipient.employeeId).toBe('E1');
    expect(back.type).toBe('salary_paid');
    expect(back.relatedId).toBe('E1');
    expect(back.read).toBe(false);
  });
});

describe('audit log doc round-trip', () => {
  it('preserves the change record', () => {
    const a: AuditEntry = { id: 'a1', at: '2026-03-01T00:00:00.000Z', by: 'Admin (admin)', entity: 'Employee', target: 'Bob (E1)', field: 'Monthly salary', oldValue: '0', newValue: '100', reason: 'fix' };
    const back = auditFromDoc(auditToDoc(a));
    expect(back).toEqual(a);
  });
});

describe('hydrateAttendance', () => {
  const employees = [{ id: 'E2', name: 'Bob' }] as Employee[];
  const branches = [{ id: 'BR-BD', name: 'Beadon Street' }] as Branch[];
  const today = '2026-06-15';

  it('rebuilds the grid and today-only check-ins', () => {
    const docs: Record<string, unknown>[] = [
      { id: 'mark-E1-2026-03-01', employeeId: 'E1', date: '2026-03-01', status: 'present', method: 'manual' },
      { id: 'mark-E1-2026-03-03', employeeId: 'E1', date: '2026-03-03', status: 'absent', method: 'manual' },
      { id: 'chk-1', employeeId: 'E2', date: today, checkInTime: '9:00 AM', method: 'kiosk', proofStatus: 'strong', approvalStatus: 'approved', employeeName: 'Bob', branchName: 'Beadon Street', dateLabel: '15 Jun 2026', factors: { qrMatched: false, gpsInsideRadius: true, wifiMatched: true, selfieCaptured: false, managerApproved: false } },
      { id: 'chk-old', employeeId: 'E2', date: '2026-06-14', checkInTime: '9:00 AM', method: 'kiosk', proofStatus: 'strong', approvalStatus: 'approved' },
    ];
    const { marks, checkins } = hydrateAttendance(docs, employees, branches, today);

    expect(marks.E1[0]).toBe('P');
    expect(marks.E1[2]).toBe('A');
    expect(marks.E1[1]).toBe('O'); // untouched days default to week-off

    expect(checkins).toHaveLength(1); // yesterday's check-in is excluded
    expect(checkins[0].employeeName).toBe('Bob');
    expect(checkins[0].branch).toBe('Beadon Street');
    expect(checkins[0].approved).toBe(true);
    expect(checkins[0].method).toBe('kiosk');
  });
});

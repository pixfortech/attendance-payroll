import type { Employee } from '../types';
import { CURRENT_MONTH } from './month';

/** Daily attendance mark: Present, Absent, Half-day, paid Leave, week-Off. */
export type Mark = 'P' | 'A' | 'H' | 'L' | 'O';
export const MARK_CYCLE: Mark[] = ['P', 'A', 'H', 'L', 'O'];

function genRow(seed: number, days: number): Mark[] {
  const out: Mark[] = [];
  let s = seed;
  for (let d = 1; d <= days; d++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    if (d % 7 === 0) out.push('O');
    else if (r > 0.93) out.push('A');
    else if (r > 0.88) out.push('L');
    else if (r > 0.84) out.push('H');
    else out.push('P');
  }
  return out;
}

function hashSeed(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

/** Worked days from a mark row: present = 1, half = 0.5. */
export function workedFromMarks(marks: Mark[]): number {
  return marks.reduce((sum, m) => sum + (m === 'P' ? 1 : m === 'H' ? 0.5 : 0), 0);
}

export function countMark(marks: Mark[], mark: Mark): number {
  return marks.filter((m) => m === mark).length;
}

/** Derive an employee's month attendance figures from a row of daily marks.
 *  Single source of truth used by manual marking, bulk marking and Firestore
 *  hydration so worked-days/salary always agree with the grid. */
export function figuresFromMarks(marks: Mark[]): { worked: number; daysPresent: number; daysAbsent: number; daysHalf: number; leaveUsed: number } {
  return {
    worked: workedFromMarks(marks),
    daysPresent: countMark(marks, 'P'),
    daysAbsent: countMark(marks, 'A'),
    daysHalf: countMark(marks, 'H'),
    leaveUsed: countMark(marks, 'L') + countMark(marks, 'A'),
  };
}

/** Seed a month of attendance marks per employee, keyed by employee id. */
export function buildAttendanceMarks(employees: Employee[], days = CURRENT_MONTH.workingDays): Record<string, Mark[]> {
  const out: Record<string, Mark[]> = {};
  for (const e of employees) out[e.id] = genRow(hashSeed(e.id), days);
  return out;
}

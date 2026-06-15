import { describe, it, expect } from 'vitest';
import { figuresFromMarks, workedFromMarks, type Mark } from './attendanceMarks';

const row = (...marks: Mark[]): Mark[] => marks;

describe('figuresFromMarks — attendance → worked/leave recalculation', () => {
  it('one Present day → worked 1', () => {
    const f = figuresFromMarks(row('P', 'O', 'O'));
    expect(f.worked).toBe(1);
    expect(f.daysPresent).toBe(1);
  });
  it('one Half-day → worked 0.5', () => {
    expect(figuresFromMarks(row('H', 'O')).worked).toBe(0.5);
    expect(figuresFromMarks(row('H', 'O')).daysHalf).toBe(1);
  });
  it('counts absent + leave into leaveUsed and worked stays accurate', () => {
    const f = figuresFromMarks(row('P', 'P', 'H', 'A', 'L', 'O'));
    expect(f.worked).toBe(2.5); // 2 present + 1 half
    expect(f.daysAbsent).toBe(1);
    expect(f.leaveUsed).toBe(2); // 1 leave + 1 absent
  });
  it('agrees with workedFromMarks', () => {
    const r = row('P', 'H', 'P', 'O', 'A');
    expect(figuresFromMarks(r).worked).toBe(workedFromMarks(r));
  });
});

import { describe, it, expect } from 'vitest';
import { daysInclusive, formatDMY, isFutureISO, monthsBetween, parseDate, toISO, toISODate } from './dates';

describe('parseDate — multi-format', () => {
  it('parses ISO, DD/MM/YYYY, DD-MM-YYYY and human formats to the same day', () => {
    for (const v of ['2024-04-19', '19/04/2024', '19-04-2024']) {
      const d = parseDate(v)!;
      expect(d).not.toBeNull();
      expect(toISO(d)).toBe('2024-04-19');
    }
    expect(toISO(parseDate('12 Nov 2023')!)).toBe('2023-11-12');
  });
  it('rejects junk', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('—')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });
  it('toISODate / formatDMY round-trip', () => {
    expect(toISODate('19/04/2024')).toBe('2024-04-19');
    expect(formatDMY('2024-04-19')).toBe('19/04/2024');
  });
});

describe('daysInclusive', () => {
  it('19-06-2026 → 23-06-2026 is 5 inclusive days', () => {
    expect(daysInclusive('2026-06-19', '2026-06-23')).toBe(5);
    expect(daysInclusive('19/06/2026', '23/06/2026')).toBe(5);
  });
  it('same day is 1; reversed/invalid is 0', () => {
    expect(daysInclusive('2026-06-19', '2026-06-19')).toBe(1);
    expect(daysInclusive('2026-06-23', '2026-06-19')).toBe(0);
    expect(daysInclusive('', '2026-06-19')).toBe(0);
  });
});

describe('monthsBetween (tenure)', () => {
  it('19/04/2024 is well over 3 months by mid-2026', () => {
    const join = parseDate('19/04/2024')!;
    expect(monthsBetween(join, new Date(2026, 5, 19))).toBe(26); // Apr 2024 → Jun 2026
    expect(monthsBetween(join, new Date(2026, 5, 19))).toBeGreaterThanOrEqual(3);
  });
  it('within the same month is 0', () => {
    expect(monthsBetween(new Date(2026, 5, 1), new Date(2026, 5, 20))).toBe(0);
    expect(monthsBetween(new Date(2026, 5, 20), new Date(2026, 6, 10))).toBe(0); // day-of-month not reached
  });
});

describe('isFutureISO', () => {
  it('detects future vs past dates', () => {
    expect(isFutureISO(toISO(new Date(Date.now() + 5 * 86_400_000)))).toBe(true);
    expect(isFutureISO('2020-01-01')).toBe(false);
  });
});

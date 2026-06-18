/* ============================================================
   Central date handling (Phase 3B hotfix, Part A)

   - Store dates internally as ISO `YYYY-MM-DD`.
   - Display as `DD/MM/YYYY`.
   - NEVER compute tenure/leave-days from a display string without parsing here.
   - Safe parsing of legacy values: ISO, DD/MM/YYYY, DD-MM-YYYY, and common
     human formats like "12 Nov 2023".
   ============================================================ */

const pad = (n: number) => String(n).padStart(2, '0');

/** Local midnight Date for (y, m=1-12, d), or null if out of range. */
function mk(y: number, mo: number, d: number): Date | null {
  const dt = new Date(y, mo - 1, d);
  return Number.isNaN(dt.getTime()) || dt.getMonth() !== mo - 1 || dt.getDate() !== d ? null : dt;
}

/** Parse a date from ISO / DD-MM-YYYY / DD/MM/YYYY / "12 Nov 2023". */
export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s || s === '—') return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return mk(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) return mk(Number(m[3]), Number(m[2]), Number(m[1]));
  const d = new Date(s); // fallback (e.g. "12 Nov 2023")
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** A Date → ISO `YYYY-MM-DD`. */
export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Any supported value → ISO, or '' when unparseable (for date inputs). */
export function toISODate(value?: string | null): string {
  const d = parseDate(value);
  return d ? toISO(d) : '';
}

/** Any supported value → `DD/MM/YYYY` for display (falls back to the raw value). */
export function formatDMY(value?: string | null): string {
  const d = parseDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : value && value !== '—' ? value : '—';
}

export function todayISO(): string {
  return toISO(new Date());
}

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Inclusive day count between two dates (19→23 June = 5). 0 if invalid/reversed. */
export function daysInclusive(startValue?: string | null, endValue?: string | null): number {
  const s = parseDate(startValue);
  const e = parseDate(endValue);
  if (!s || !e) return 0;
  const ms = stripTime(e) - stripTime(s);
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000) + 1;
}

/** Whole months between two dates (rolls back a month if day-of-month not reached). */
export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Is the value strictly after today (date-only comparison)? */
export function isFutureISO(value?: string | null): boolean {
  const d = parseDate(value);
  return d ? stripTime(d) > stripTime(new Date()) : false;
}

/* ============================================================
   CSV / XLSX import for employees and branches (SheetJS).
   Reads the first sheet, maps flexible column headers, and returns
   typed rows ready for the store's import actions.
   ============================================================ */
import type { NewBranchInput, NewEmployeeInput } from '../store/AppStore';

type Row = Record<string, unknown>;

async function readRows(file: File): Promise<Row[]> {
  // Lazy-load SheetJS so it is only fetched when an import actually happens.
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });
}

/** Read a cell by any of the candidate header names (case/space-insensitive). */
function pick(row: Row, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find((rk) => rk.trim().toLowerCase() === c);
    if (k != null && row[k] != null) return String(row[k]).trim();
  }
  return '';
}

export const EMPLOYEE_COLUMNS = ['Name', 'Branch', 'Role', 'Salary', 'Basis', 'Joined', 'Phone', 'Email'];
export const BRANCH_COLUMNS = ['Name', 'Code', 'Manager', 'Phone', 'Address'];

export async function parseEmployeeFile(file: File): Promise<NewEmployeeInput[]> {
  const rows = await readRows(file);
  return rows
    .map((r) => ({
      name: pick(r, ['name', 'employee', 'full name']),
      branch: pick(r, ['branch']),
      role: pick(r, ['role', 'designation']) || 'Helper',
      salary: Number(pick(r, ['salary', 'monthly salary'])) || 0,
      basis: /cal/i.test(pick(r, ['basis'])) ? ('calendar' as const) : ('fixed30' as const),
      joined: pick(r, ['joined', 'joining date', 'doj']) || '01 Mar 2026',
      phone: pick(r, ['phone', 'mobile', 'contact']) || undefined,
      email: pick(r, ['email', 'e-mail']) || undefined,
    }))
    .filter((e) => e.name);
}

export async function parseBranchFile(file: File): Promise<NewBranchInput[]> {
  const rows = await readRows(file);
  return rows
    .map((r) => ({
      name: pick(r, ['name', 'branch', 'branch name']),
      code: pick(r, ['code', 'branch code']) || pick(r, ['name', 'branch']).slice(0, 2).toUpperCase(),
      manager: pick(r, ['manager', 'branch manager']) || '—',
      managerPhone: pick(r, ['phone', 'mobile', 'contact']) || undefined,
      address: pick(r, ['address', 'location']) || undefined,
    }))
    .filter((b) => b.name);
}

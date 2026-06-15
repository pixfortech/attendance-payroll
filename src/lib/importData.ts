/* ============================================================
   CSV / XLSX import for branches & employees.

   Real schema:
     branches:  branchCode, branchName, addressLine1/2, landmark, city, state,
                pincode, phone, latitude, longitude, radiusMeters, active
     employees: employeeCode, name, mobile, branchCode, branchName, role,
                designation, gender, monthlySalary, joiningDate, status,
                salaryBasis, latitude, longitude, notes

   Stable IDs: branch.id = branchCode, employee.id = employeeCode (so re-import
   merges instead of duplicating). Salary is numeric (null when blank); phone is
   kept as a string. No PIN is ever imported/stored.
   ============================================================ */
import type { Branch, Employee, SalaryBasis } from '../types';

type RawRow = Record<string, unknown>;

async function readRows(file: File): Promise<RawRow[]> {
  const XLSX = await import('xlsx'); // lazy — only loaded when importing
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
}

function get(row: RawRow, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find((rk) => rk.trim().toLowerCase() === c.toLowerCase());
    if (k != null && row[k] != null) return String(row[k]).trim();
  }
  return '';
}

function toNumberOrNull(v: string): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------- parsed rows ---------- */
export interface ParsedBranchRow {
  row: number;
  branchCode: string;
  branchName: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  active: string;
}

export interface ParsedEmployeeRow {
  row: number;
  employeeCode: string;
  name: string;
  mobile: string;
  branchCode: string;
  branchName: string;
  role: string;
  designation: string;
  monthlySalary: number | null;
  joiningDate: string;
  status: string;
  salaryBasis: string;
  notes: string;
}

export async function parseBranchCsv(file: File): Promise<ParsedBranchRow[]> {
  const rows = await readRows(file);
  return rows.map((r, i) => ({
    row: i + 2, // +1 header, +1 to 1-index
    branchCode: get(r, 'branchCode', 'code'),
    branchName: get(r, 'branchName', 'name', 'branch'),
    address: [get(r, 'addressLine1'), get(r, 'addressLine2'), get(r, 'landmark'), get(r, 'city'), get(r, 'state'), get(r, 'pincode')].filter(Boolean).join(', '),
    phone: get(r, 'phone', 'mobile', 'contact'),
    latitude: toNumberOrNull(get(r, 'latitude', 'lat')),
    longitude: toNumberOrNull(get(r, 'longitude', 'lng', 'long')),
    radiusMeters: toNumberOrNull(get(r, 'radiusMeters', 'radius')),
    active: get(r, 'active', 'status') || 'active',
  }));
}

export async function parseEmployeeCsv(file: File): Promise<ParsedEmployeeRow[]> {
  const rows = await readRows(file);
  return rows.map((r, i) => ({
    row: i + 2,
    employeeCode: get(r, 'employeeCode', 'code', 'empcode'),
    name: get(r, 'name', 'employee', 'full name'),
    mobile: get(r, 'mobile', 'phone', 'contact'),
    branchCode: get(r, 'branchCode', 'branch code'),
    branchName: get(r, 'branchName', 'branch'),
    role: get(r, 'role'),
    designation: get(r, 'designation'),
    monthlySalary: toNumberOrNull(get(r, 'monthlySalary', 'salary')),
    joiningDate: get(r, 'joiningDate', 'joined', 'doj'),
    status: get(r, 'status') || 'active',
    salaryBasis: get(r, 'salaryBasis', 'basis'),
    notes: get(r, 'notes'),
  }));
}

/* ---------- preview + build ---------- */
export type RowStatus = 'valid' | 'warning' | 'error';

export interface PreviewRow {
  rowNo: number;
  code: string;
  label: string;
  sub: string;
  status: RowStatus;
  isUpdate: boolean;
  messages: string[];
}

export interface ImportPreview {
  rows: PreviewRow[];
  total: number;
  valid: number;
  warnings: number;
  errors: number;
  updates: number;
  uploadable: number;
  blocking: string[];
}

function summarize(rows: PreviewRow[], blocking: string[]): ImportPreview {
  return {
    rows,
    total: rows.length,
    valid: rows.filter((r) => r.status === 'valid').length,
    warnings: rows.filter((r) => r.status === 'warning').length,
    errors: rows.filter((r) => r.status === 'error').length,
    updates: rows.filter((r) => r.isUpdate && r.status !== 'error').length,
    uploadable: rows.filter((r) => r.status !== 'error').length,
    blocking,
  };
}

function buildBranch(p: ParsedBranchRow): Branch {
  return {
    id: p.branchCode,
    name: p.branchName,
    code: p.branchCode,
    address: p.address || '—',
    manager: '—',
    managerPhone: p.phone || '—',
    staffCount: 0,
    presentToday: 0,
    payable: 0,
    status: p.active.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    defaultBasis: 'fixed30',
    geofence: {
      latitude: p.latitude ?? 22.5726,
      longitude: p.longitude ?? 88.3639,
      radiusMetres: p.radiusMeters ?? 100,
      wifiSsid: `Ganguram-${p.branchCode}`,
      gpsRequired: true,
      selfieRequired: false,
      managerApprovalRequired: false,
    },
    qr: { token: `GNGQR-${p.branchCode}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, status: 'active', rotation: 'monthly', generatedAt: '14 Mar 2026' },
  };
}

function buildEmployee(p: ParsedEmployeeRow, branch: Branch): Employee {
  return {
    id: p.employeeCode,
    name: p.name,
    branch: branch.name,
    branchCode: branch.code,
    role: p.designation || p.role || 'Worker',
    joined: p.joiningDate || '—',
    isJoiningMonth: false,
    tenureMonths: 0,
    salary: p.monthlySalary ?? 0,
    salaryMissing: p.monthlySalary == null,
    basis: (p.salaryBasis.toLowerCase() === 'calendar' ? 'calendar' : 'fixed30') as SalaryBasis,
    status: p.status.toLowerCase() === 'resigned' ? 'resigned' : 'active',
    worked: 0,
    daysPresent: 0,
    daysAbsent: 0,
    daysHalf: 0,
    leaveUsed: 0,
    phone: p.mobile || '—',
    email: '—',
    login: 'disabled',
    lastLogin: 'Never',
    halfTiffin: true,
    tiffinDays: 0,
    tiffin: [],
    overtimeHours: 0,
    bonusAmount: 0,
    payrollStatus: 'pending',
    advances: [],
    payments: [],
    leaves: [],
    documents: [],
  };
}

export function previewBranches(parsed: ParsedBranchRow[], existing: Branch[]): { preview: ImportPreview; built: Branch[] } {
  const existingIds = new Set(existing.map((b) => b.id));
  const seen = new Set<string>();
  const rows: PreviewRow[] = [];
  const built: Branch[] = [];

  for (const p of parsed) {
    const messages: string[] = [];
    let status: RowStatus = 'valid';
    if (!p.branchCode) { messages.push('Missing branch code'); status = 'error'; }
    if (!p.branchName) { messages.push('Missing branch name'); status = 'error'; }
    if (p.branchCode && seen.has(p.branchCode)) { messages.push('Duplicate branch code in file'); status = 'error'; }
    if (p.branchCode) seen.add(p.branchCode);
    const isUpdate = !!p.branchCode && existingIds.has(p.branchCode);
    if (isUpdate && status !== 'error') messages.push('Updates an existing branch');
    rows.push({ rowNo: p.row, code: p.branchCode || '—', label: p.branchName || '—', sub: p.address, status, isUpdate, messages });
    if (status !== 'error') built.push(buildBranch(p));
  }
  return { preview: summarize(rows, []), built };
}

export function previewEmployees(parsed: ParsedEmployeeRow[], branches: Branch[], existing: Employee[]): { preview: ImportPreview; built: Employee[] } {
  const branchByCode = new Map(branches.map((b) => [b.code, b]));
  const existingIds = new Set(existing.map((e) => e.id));
  const seen = new Set<string>();
  const unknownBranches = new Set<string>();
  const rows: PreviewRow[] = [];
  const built: Employee[] = [];

  for (const p of parsed) {
    const messages: string[] = [];
    let status: RowStatus = 'valid';
    if (!p.employeeCode) { messages.push('Missing employee code'); status = 'error'; }
    if (!p.name) { messages.push('Missing name'); status = 'error'; }
    if (p.employeeCode && seen.has(p.employeeCode)) { messages.push('Duplicate employee code in file'); status = 'error'; }
    if (p.employeeCode) seen.add(p.employeeCode);

    const branch = p.branchCode ? branchByCode.get(p.branchCode) : undefined;
    if (!branch) {
      messages.push(`Unknown branch code "${p.branchCode || '(blank)'}" — import branches first`);
      status = 'error';
      if (p.branchCode) unknownBranches.add(p.branchCode);
    }
    if (p.monthlySalary == null && status !== 'error') {
      messages.push('Monthly salary missing; update before payroll');
      status = 'warning';
    }
    const isUpdate = !!p.employeeCode && existingIds.has(p.employeeCode);
    if (isUpdate && status !== 'error') messages.push('Updates an existing employee');

    rows.push({ rowNo: p.row, code: p.employeeCode || '—', label: p.name || '—', sub: branch ? branch.name : p.branchName || '—', status, isUpdate, messages });
    if (status !== 'error' && branch) built.push(buildEmployee(p, branch));
  }

  const blocking = unknownBranches.size > 0 ? [`${unknownBranches.size} unknown branch code(s): ${[...unknownBranches].join(', ')}. Import branches first.`] : [];
  return { preview: summarize(rows, blocking), built };
}

import { describe, it, expect } from 'vitest';
import { previewBranches, previewEmployees, type ParsedBranchRow, type ParsedEmployeeRow } from './importData';
import type { Branch, Employee } from '../types';

function branch(code: string, name: string): Branch {
  return {
    id: code, name, code, address: '—', manager: '—', managerPhone: '—', staffCount: 0, presentToday: 0, payable: 0, status: 'active', defaultBasis: 'fixed30',
    geofence: { latitude: 0, longitude: 0, radiusMetres: 75, gpsRequired: true, selfieRequired: false, managerApprovalRequired: false },
    qr: { token: 't', status: 'active', rotation: 'monthly', generatedAt: '—' },
  };
}

const empRow = (over: Partial<ParsedEmployeeRow>): ParsedEmployeeRow => ({
  row: 2, employeeCode: 'EMP001', name: 'Gobindo Das', mobile: '+91 75015 57361', branchCode: 'BEADON', branchName: 'Beadon Street', role: 'employee', designation: 'Counter Sales', monthlySalary: 10000, joiningDate: '', status: 'active', salaryBasis: 'fixed30', notes: '', ...over,
});

describe('previewBranches', () => {
  const rows: ParsedBranchRow[] = [
    { row: 2, branchCode: 'BEADON', branchName: 'Beadon Street', address: 'Kolkata', phone: '+91 90730 96322', latitude: 22.58, longitude: 88.37, radiusMeters: 75, active: 'active' },
    { row: 3, branchCode: 'BEADON', branchName: 'Dup', address: '', phone: '', latitude: null, longitude: null, radiusMeters: null, active: 'active' },
    { row: 4, branchCode: '', branchName: 'No code', address: '', phone: '', latitude: null, longitude: null, radiusMeters: null, active: 'active' },
  ];
  const { preview, built } = previewBranches(rows, [branch('KARKHANA', 'Karkhana')]);

  it('flags duplicate-in-file and missing code as errors', () => {
    expect(preview.total).toBe(3);
    expect(preview.errors).toBe(2);
    expect(preview.valid).toBe(1);
    expect(preview.uploadable).toBe(1);
  });
  it('builds stable id = branchCode for valid rows', () => {
    expect(built).toHaveLength(1);
    expect(built[0].id).toBe('BEADON');
    expect(built[0].geofence.radiusMetres).toBe(75);
  });
});

describe('previewEmployees — branch-first mapping & merge', () => {
  const branches = [branch('BEADON', 'Beadon Street'), branch('KARKHANA', 'Karkhana')];
  const existing = [{ id: 'EMP001' } as Employee];
  const rows: ParsedEmployeeRow[] = [
    empRow({ row: 2, employeeCode: 'EMP001' }), // valid + update
    empRow({ row: 3, employeeCode: 'EMP021', name: 'Subhash Ghosh', branchCode: 'KARKHANA', branchName: 'Karkhana', monthlySalary: null, mobile: '' }), // warning: salary missing
    empRow({ row: 4, employeeCode: 'EMP099', name: 'Ghost', branchCode: 'NOWHERE', branchName: 'Nowhere' }), // error: unknown branch
  ];
  const { preview, built } = previewEmployees(rows, branches, existing);

  it('counts valid / warning / error correctly', () => {
    expect(preview.total).toBe(3);
    expect(preview.valid).toBe(1);
    expect(preview.warnings).toBe(1);
    expect(preview.errors).toBe(1);
    expect(preview.updates).toBe(1);
    expect(preview.uploadable).toBe(2);
  });

  it('blocks upload when an employee maps to an unknown branch', () => {
    expect(preview.blocking.length).toBe(1);
    expect(preview.blocking[0]).toContain('NOWHERE');
  });

  it('builds stable ids, numeric salary, string phone, and missing-salary flag', () => {
    expect(built).toHaveLength(2);
    const emp001 = built.find((e) => e.id === 'EMP001')!;
    expect(emp001.branch).toBe('Beadon Street');
    expect(emp001.branchCode).toBe('BEADON');
    expect(typeof emp001.salary).toBe('number');
    expect(emp001.salary).toBe(10000);
    expect(typeof emp001.phone).toBe('string');

    const emp021 = built.find((e) => e.id === 'EMP021')!;
    expect(emp021.salaryMissing).toBe(true);
    expect(emp021.salary).toBe(0);
  });

  it('flags a duplicate employee code within the file as an error', () => {
    const dup = previewEmployees([empRow({ row: 2 }), empRow({ row: 3 })], branches, []);
    expect(dup.preview.errors).toBe(1);
    expect(dup.preview.uploadable).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import { activeBranches, activeBranchNames, branchFilterOptions, branchNameForFilter, employeeInBranch } from './branches';
import type { Branch, Employee } from '../types';

// Code-based ids like the imported Firestore data (ALAMBAZAR, BEADON, …).
const branch = (o: Partial<Branch>): Branch => ({ id: o.code ?? 'X', name: 'X', code: 'X', address: '', manager: '', managerPhone: '', staffCount: 0, presentToday: 0, payable: 0, status: 'active', defaultBasis: 'fixed30', geofence: { latitude: 0, longitude: 0, radiusMetres: 100, gpsRequired: false, selfieRequired: false, managerApprovalRequired: false }, qr: { token: 't', status: 'active', rotation: 'monthly', generatedAt: '' }, ...o } as Branch);

const branches: Branch[] = [
  branch({ code: 'BEADON', name: 'Beadon Street' }),
  branch({ code: 'ALAMBAZAR', name: 'Alambazar' }),
  branch({ code: 'MISTI_HUB', name: 'Misti Hub' }),
  branch({ code: 'OLD', name: 'Old Branch', archived: true }),
  branch({ code: 'OFF', name: 'Closed', status: 'inactive' }),
];

const emp = (o: Partial<Employee>): Employee => ({ id: 'e', name: 'E', branch: '', role: '', joined: '', isJoiningMonth: false, tenureMonths: 0, salary: 0, basis: 'fixed30', status: 'active', worked: 0, daysPresent: 0, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '', email: '', login: 'disabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0, payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o } as Employee);

describe('active branch selectors', () => {
  it('excludes archived and inactive branches', () => {
    expect(activeBranches(branches).map((b) => b.code)).toEqual(['BEADON', 'ALAMBAZAR', 'MISTI_HUB']);
    expect(activeBranchNames(branches)).toEqual(['Beadon Street', 'Alambazar', 'Misti Hub']);
  });

  it('builds filter options that default to All branches', () => {
    const opts = branchFilterOptions(branches);
    expect(opts[0]).toEqual({ value: '', label: 'All branches' }); // default = All, never Beadon
    expect(opts.slice(1)).toEqual([
      { value: 'BEADON', label: 'Beadon Street' },
      { value: 'ALAMBAZAR', label: 'Alambazar' },
      { value: 'MISTI_HUB', label: 'Misti Hub' },
    ]);
  });

  it('labels a selected filter value', () => {
    expect(branchNameForFilter('', branches)).toBe('All branches');
    expect(branchNameForFilter('ALAMBAZAR', branches)).toBe('Alambazar');
  });
});

describe('employeeInBranch', () => {
  it('"All" (empty) matches everyone', () => {
    expect(employeeInBranch(emp({ branchCode: 'ALAMBAZAR' }), '', branches)).toBe(true);
  });
  it('matches by Firestore branchCode', () => {
    expect(employeeInBranch(emp({ branchCode: 'ALAMBAZAR', branch: 'Alambazar' }), 'ALAMBAZAR', branches)).toBe(true);
    expect(employeeInBranch(emp({ branchCode: 'ALAMBAZAR' }), 'BEADON', branches)).toBe(false);
  });
  it('falls back to the branch name when no branchCode (seed/manual records)', () => {
    expect(employeeInBranch(emp({ branch: 'Misti Hub' }), 'MISTI_HUB', branches)).toBe(true);
    expect(employeeInBranch(emp({ branch: 'Beadon Street' }), 'MISTI_HUB', branches)).toBe(false);
  });
  it('works for every imported branch, not just the first', () => {
    for (const b of activeBranches(branches)) {
      expect(employeeInBranch(emp({ branchCode: b.code }), b.code, branches)).toBe(true);
    }
  });
});

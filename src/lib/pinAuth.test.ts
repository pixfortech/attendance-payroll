import { describe, it, expect } from 'vitest';
import { findLoginUser, isPinFormat, isWeakPin, validatePin, verifyPinLogin } from './pinAuth';
import type { Employee, PortalAccess } from '../types';

const emp = (o: Partial<Employee>): Employee => ({ id: 'GNG-BD-0142', name: 'Subir Maity', branch: 'Beadon Street', branchCode: 'BD', role: 'Counter Sales', joined: '', isJoiningMonth: false, tenureMonths: 0, salary: 10000, basis: 'fixed30', status: 'active', worked: 0, daysPresent: 0, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '+91 98300 11422', email: '', login: 'enabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0, payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o } as Employee);

const access = (o: Partial<PortalAccess>): PortalAccess => ({ loginEnabled: true, pinSet: true, portalRole: 'employee', loginStatus: 'active', failedAttempts: 0, lockedUntil: null, lastLoginAt: null, passwordFallbackAllowed: true, managerBranchId: null, managerBranchCode: null, ...o });

const employees: Employee[] = [
  emp({}), // Subir — employee role (inferred), enabled
  emp({ id: 'GNG-MH-0088', name: 'Rina Das', branch: 'Mishti Hub', phone: '+91 98311 22334', login: 'disabled' }),
  emp({ id: 'GNG-BD-9001', name: 'Branch Mgr', portalAccess: access({ portalRole: 'manager', managerBranchId: 'BR-BD', managerBranchCode: 'BD' }) }),
  emp({ id: 'GNG-BD-9002', name: 'Locked Lee', portalAccess: access({ lockedUntil: Date.now() + 60_000 }) }),
  emp({ id: 'GNG-BD-9003', name: 'New Nita', portalAccess: access({ pinSet: false }) }),
];

describe('validatePin', () => {
  it('accepts 4- and 6-digit PINs', () => {
    expect(validatePin('2469').ok).toBe(true);
    expect(validatePin('246813').ok).toBe(true);
  });
  it('rejects non-digits and wrong lengths', () => {
    expect(validatePin('abcd').ok).toBe(false);
    expect(validatePin('123').ok).toBe(false);
    expect(validatePin('12345').ok).toBe(false);
  });
  it('rejects obvious/weak PINs (at setup)', () => {
    for (const p of ['0000', '1111', '1234', '123456', '654321']) {
      expect(validatePin(p).ok).toBe(false);
      expect(isWeakPin(p)).toBe(true);
    }
  });
  it('isPinFormat only checks length/digits (used at login)', () => {
    expect(isPinFormat('1234')).toBe(true); // weak but valid format
    expect(isPinFormat('123456')).toBe(true);
    expect(isPinFormat('12')).toBe(false);
    expect(isPinFormat('12a4')).toBe(false);
  });
});

describe('findLoginUser', () => {
  it('matches by full id, trailing code and mobile digits', () => {
    expect(findLoginUser(employees, 'GNG-BD-0142')?.name).toBe('Subir Maity');
    expect(findLoginUser(employees, '0142')?.name).toBe('Subir Maity'); // trailing code
    expect(findLoginUser(employees, '9830011422')?.name).toBe('Subir Maity'); // mobile digits
    expect(findLoginUser(employees, '+91 98300 11422')?.name).toBe('Subir Maity');
  });
  it('returns undefined for no match / empty', () => {
    expect(findLoginUser(employees, 'nobody')).toBeUndefined();
    expect(findLoginUser(employees, '')).toBeUndefined();
  });
});

describe('verifyPinLogin (demo, access-aware)', () => {
  it('keeps unknown IDs generic and respects disabled / locked / pin-required states', () => {
    expect(verifyPinLogin(employees, 'nobody', '2469', 'employee')).toMatchObject({ ok: false, reason: 'not_found' });
    expect(verifyPinLogin(employees, 'GNG-MH-0088', '2469', 'employee')).toMatchObject({ ok: false, reason: 'disabled' });
    expect(verifyPinLogin(employees, 'GNG-BD-9002', '2469', 'employee')).toMatchObject({ ok: false, reason: 'locked' });
    expect(verifyPinLogin(employees, 'GNG-BD-9003', '2469', 'employee')).toMatchObject({ ok: false, reason: 'pin_required' });
    expect(verifyPinLogin(employees, 'GNG-BD-0142', '12', 'employee')).toMatchObject({ ok: false, reason: 'bad_pin' });
  });
  it('enforces that the selected login type matches the portal role', () => {
    // Subir is an employee account → cannot use the Manager login.
    expect(verifyPinLogin(employees, 'GNG-BD-0142', '246813', 'manager')).toMatchObject({ ok: false, reason: 'wrong_portal' });
    // The manager account cannot use the Employee login.
    expect(verifyPinLogin(employees, 'GNG-BD-9001', '246813', 'employee')).toMatchObject({ ok: false, reason: 'wrong_portal' });
  });
  it('accepts the matching role with a valid-format PIN (weak allowed at login)', () => {
    expect(verifyPinLogin(employees, 'GNG-BD-0142', '1234', 'employee').ok).toBe(true);
    expect(verifyPinLogin(employees, 'GNG-BD-9001', '246813', 'manager').ok).toBe(true);
  });
});

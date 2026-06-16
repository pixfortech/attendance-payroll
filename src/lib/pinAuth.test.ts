import { describe, it, expect } from 'vitest';
import { findLoginUser, isWeakPin, validatePin, verifyPinLogin } from './pinAuth';
import type { Employee } from '../types';

const emp = (o: Partial<Employee>): Employee => ({ id: 'GNG-BD-0142', name: 'Subir Maity', branch: 'Beadon Street', branchCode: 'BD', role: 'Counter Sales', joined: '', isJoiningMonth: false, tenureMonths: 0, salary: 10000, basis: 'fixed30', status: 'active', worked: 0, daysPresent: 0, daysAbsent: 0, daysHalf: 0, leaveUsed: 0, phone: '+91 98300 11422', email: '', login: 'enabled', lastLogin: '', halfTiffin: true, tiffinDays: 0, tiffin: [], overtimeHours: 0, bonusAmount: 0, payrollStatus: 'pending', advances: [], payments: [], leaves: [], documents: [], ...o } as Employee);

const employees: Employee[] = [
  emp({}),
  emp({ id: 'GNG-MH-0088', name: 'Rina Das', branch: 'Mishti Hub', phone: '+91 98311 22334', login: 'disabled' }),
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
  it('rejects obvious/weak PINs', () => {
    for (const p of ['0000', '1111', '1234', '123456', '654321']) {
      expect(validatePin(p).ok).toBe(false);
      expect(isWeakPin(p)).toBe(true);
    }
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

describe('verifyPinLogin (demo)', () => {
  it('rejects unknown records, disabled accounts and bad PIN format', () => {
    expect(verifyPinLogin(employees, 'nobody', '2469')).toMatchObject({ ok: false, reason: 'not_found' });
    expect(verifyPinLogin(employees, 'GNG-MH-0088', '2469')).toMatchObject({ ok: false, reason: 'disabled' });
    expect(verifyPinLogin(employees, 'GNG-BD-0142', '12')).toMatchObject({ ok: false, reason: 'bad_pin' });
    expect(verifyPinLogin(employees, 'GNG-BD-0142', '1234')).toMatchObject({ ok: false, reason: 'bad_pin' }); // weak
  });
  it('accepts an enabled record with a valid-format PIN (demo only)', () => {
    const r = verifyPinLogin(employees, 'GNG-BD-0142', '246813');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.employee.name).toBe('Subir Maity');
  });
});

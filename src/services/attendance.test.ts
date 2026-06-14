import { describe, it, expect } from 'vitest';
import { distanceMetres, evaluateProof, isAutoApproved, isInsideRadius, validateQrScan } from './attendance';
import { BRANCHES } from '../data/branches';
import type { ProofFactors } from '../types';

const beadon = BRANCHES.find((b) => b.name === 'Beadon Street')!;
const noFactors: ProofFactors = { qrMatched: false, gpsInsideRadius: false, wifiMatched: false, selfieCaptured: false, managerApproved: false };

describe('geofence', () => {
  it('distance to the same point is 0', () => {
    expect(distanceMetres(beadon.geofence.latitude, beadon.geofence.longitude, beadon.geofence.latitude, beadon.geofence.longitude)).toBe(0);
  });
  it('a point at the branch is inside the radius', () => {
    expect(isInsideRadius(beadon, beadon.geofence.latitude, beadon.geofence.longitude)).toBe(true);
  });
  it('a far-away point is outside the radius', () => {
    expect(isInsideRadius(beadon, 22.7, 88.5)).toBe(false);
  });
});

describe('evaluateProof', () => {
  it('manager approval is always strong', () => {
    expect(evaluateProof({ ...noFactors, managerApproved: true })).toBe('strong');
  });
  it('QR + GPS is strong', () => {
    expect(evaluateProof({ ...noFactors, qrMatched: true, gpsInsideRadius: true })).toBe('strong');
  });
  it('QR alone is medium', () => {
    expect(evaluateProof({ ...noFactors, qrMatched: true })).toBe('medium');
  });
  it('selfie alone needs approval', () => {
    expect(evaluateProof({ ...noFactors, selfieCaptured: true })).toBe('needs_approval');
  });
});

describe('isAutoApproved', () => {
  it('weak proof is held for approval', () => {
    expect(isAutoApproved(beadon, { ...noFactors, selfieCaptured: true })).toBe(false);
  });
  it('strong proof is auto-approved', () => {
    expect(isAutoApproved(beadon, { ...noFactors, qrMatched: true, gpsInsideRadius: true })).toBe(true);
  });
  it('a branch that requires manager approval holds even medium proof', () => {
    const strict = BRANCHES.find((b) => b.geofence.managerApprovalRequired)!;
    expect(isAutoApproved(strict, { ...noFactors, qrMatched: true })).toBe(false);
  });
});

describe('validateQrScan', () => {
  it('passes for a valid token, active branch, allowed employee, in window & inside radius', () => {
    const r = validateQrScan({
      scannedToken: beadon.qr.token,
      branch: beadon,
      employeeBranch: 'Beadon Street',
      withinWindow: true,
      gps: { lat: beadon.geofence.latitude, lng: beadon.geofence.longitude },
    });
    expect(r.ok).toBe(true);
  });
  it('fails on a wrong token', () => {
    const r = validateQrScan({ scannedToken: 'WRONG', branch: beadon, employeeBranch: 'Beadon Street', withinWindow: true, gps: null });
    expect(r.ok).toBe(false);
    expect(r.checks.find((c) => c.label === 'QR token is valid')?.passed).toBe(false);
  });
  it('fails when the employee is not allowed at the branch', () => {
    const r = validateQrScan({ scannedToken: beadon.qr.token, branch: beadon, employeeBranch: 'Baranagar', withinWindow: true, gps: { lat: beadon.geofence.latitude, lng: beadon.geofence.longitude } });
    expect(r.ok).toBe(false);
  });
});

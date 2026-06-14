/* ============================================================
   Attendance proof, QR validation & geofence.

   When an employee checks in, we collect proof factors (branch QR matched,
   GPS inside radius, branch Wi-Fi matched, selfie captured, manager approved)
   and derive a proof strength. Weak proof is held for manager approval rather
   than auto-approved.
   ============================================================ */

import type { Branch, ProofFactors, ProofMethod, ProofStrength } from '../types';

/** Haversine distance between two lat/lng points, in metres. */
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export function isInsideRadius(branch: Branch, lat: number, lng: number): boolean {
  const d = distanceMetres(branch.geofence.latitude, branch.geofence.longitude, lat, lng);
  return d <= branch.geofence.radiusMetres;
}

/** Weighted proof score → strength. Manager approval always makes it strong. */
export function evaluateProof(factors: ProofFactors): ProofStrength {
  if (factors.managerApproved) return 'strong';
  let score = 0;
  if (factors.qrMatched) score += 2;
  if (factors.gpsInsideRadius) score += 2;
  if (factors.wifiMatched) score += 1;
  if (factors.selfieCaptured) score += 1;
  if (score >= 4) return 'strong';
  if (score >= 2) return 'medium';
  return 'needs_approval';
}

/**
 * Whether a check-in is auto-approved. Weak proof, or a branch that requires
 * manager approval (without it), is held as Pending Manager Approval.
 */
export function isAutoApproved(branch: Branch, factors: ProofFactors): boolean {
  if (factors.managerApproved) return true;
  if (branch.geofence.managerApprovalRequired) return false;
  return evaluateProof(factors) !== 'needs_approval';
}

export const PROOF_STRENGTH_LABEL: Record<ProofStrength, string> = {
  strong: 'Strong proof',
  medium: 'Medium proof',
  needs_approval: 'Needs approval',
};

export const PROOF_METHOD_LABEL: Record<ProofMethod, string> = {
  qr: 'Branch QR',
  gps: 'GPS',
  selfie: 'Selfie',
  kiosk: 'Kiosk',
  manual: 'Manual',
};

export interface QrScanInput {
  scannedToken: string;
  branch: Branch;
  /** Branch the employee is assigned to / allowed at. */
  employeeBranch: string;
  withinWindow: boolean;
  /** Provided GPS fix, if any. */
  gps?: { lat: number; lng: number } | null;
}

export interface QrCheck {
  label: string;
  passed: boolean;
}

export interface QrValidationResult {
  ok: boolean;
  checks: QrCheck[];
}

/** Validate a scanned branch QR against all attendance rules. */
export function validateQrScan(input: QrScanInput): QrValidationResult {
  const { branch, scannedToken, employeeBranch, withinWindow, gps } = input;
  const checks: QrCheck[] = [];

  checks.push({ label: 'QR belongs to an active branch', passed: branch.status === 'active' });
  checks.push({ label: 'QR token is valid', passed: scannedToken === branch.qr.token });
  checks.push({ label: 'QR is not expired', passed: branch.qr.status === 'active' });
  checks.push({ label: 'Employee allowed at this branch', passed: employeeBranch === branch.name });
  checks.push({ label: 'Check-in within allowed window', passed: withinWindow });

  if (branch.geofence.gpsRequired || gps) {
    const inside = gps ? isInsideRadius(branch, gps.lat, gps.lng) : false;
    checks.push({ label: 'GPS within branch radius', passed: inside });
  }

  return { ok: checks.every((c) => c.passed), checks };
}

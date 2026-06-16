/* ============================================================
   Attendance capture evaluation (Phase 3B)

   Pure logic that decides whether a captured attendance is auto-verified or
   must go to the review queue. Used by QR / GPS / Kiosk / manual flows so the
   rules live in one tested place. No face recognition / biometrics here.
   ============================================================ */
import type { AttendanceSource, Branch, VerificationStatus } from '../types';
import { distanceMetres } from '../services/attendance';

export interface CaptureInput {
  source: AttendanceSource;
  branch?: Branch;
  /** Branch code the employee is assigned to (for context). */
  employeeBranchCode?: string;
  /** For QR: the branch code embedded in the scanned QR. */
  scannedBranchCode?: string | null;
  /** GPS fix, if captured. */
  gps?: { lat: number; lng: number } | null;
  /** True when the browser denied / could not provide a location. */
  gpsDenied?: boolean;
}

export interface CaptureResult {
  verificationStatus: VerificationStatus;
  reason?: string;
  distanceMetres?: number;
}

/** Decide the verification status for a capture. Anything uncertain becomes
 *  `needs_review` rather than being silently approved or hard-failed. */
export function evaluateCapture(input: CaptureInput): CaptureResult {
  const { source, branch, scannedBranchCode, gps, gpsDenied } = input;

  // QR scanned for a different branch → never silently approve.
  if (source === 'qr' && scannedBranchCode && branch && scannedBranchCode !== branch.code) {
    return { verificationStatus: 'needs_review', reason: 'QR belongs to another branch' };
  }

  // GPS is considered when the source is GPS or the branch requires it.
  const gpsConsidered = source === 'gps' || !!branch?.geofence.gpsRequired || (!!gps && !!branch);
  if (gpsConsidered) {
    if (gpsDenied || !gps) {
      return { verificationStatus: 'needs_review', reason: 'Location unavailable or denied' };
    }
    if (branch) {
      const d = distanceMetres(branch.geofence.latitude, branch.geofence.longitude, gps.lat, gps.lng);
      if (d > branch.geofence.radiusMetres) {
        return { verificationStatus: 'needs_review', reason: `Outside geofence (~${d}m)`, distanceMetres: d };
      }
      // Inside the geofence — but a manager-approval branch still reviews.
      if (branch.geofence.managerApprovalRequired) {
        return { verificationStatus: 'needs_review', reason: 'Branch requires manager approval', distanceMetres: d };
      }
      return { verificationStatus: 'verified', distanceMetres: d };
    }
  }

  if (branch?.geofence.managerApprovalRequired) {
    return { verificationStatus: 'needs_review', reason: 'Branch requires manager approval' };
  }
  return { verificationStatus: 'verified' };
}

/** Map a verification status onto the legacy proof "approved" flag. */
export function isVerified(status: VerificationStatus): boolean {
  return status === 'verified';
}

import { describe, it, expect } from 'vitest';
import { evaluateCapture } from './attendanceCapture';
import type { Branch } from '../types';

const branch = (geo?: Partial<Branch['geofence']>): Branch => ({
  id: 'BR-BD', name: 'Beadon Street', code: 'BD', address: '', manager: '', managerPhone: '', staffCount: 0, presentToday: 0, payable: 0, status: 'active', defaultBasis: 'fixed30',
  geofence: { latitude: 22.5958, longitude: 88.3639, radiusMetres: 80, gpsRequired: false, selfieRequired: false, managerApprovalRequired: false, ...geo },
  qr: { token: 't', status: 'active', rotation: 'weekly', generatedAt: '' },
});

describe('evaluateCapture', () => {
  it('manual / kiosk without GPS is verified', () => {
    expect(evaluateCapture({ source: 'manual', branch: branch() }).verificationStatus).toBe('verified');
    expect(evaluateCapture({ source: 'kiosk', branch: branch() }).verificationStatus).toBe('verified');
  });
  it('QR for the wrong branch goes to review (never silently approved)', () => {
    const r = evaluateCapture({ source: 'qr', branch: branch(), scannedBranchCode: 'MH' });
    expect(r.verificationStatus).toBe('needs_review');
    expect(r.reason).toMatch(/another branch/i);
  });
  it('QR for the correct branch is verified', () => {
    expect(evaluateCapture({ source: 'qr', branch: branch(), scannedBranchCode: 'BD' }).verificationStatus).toBe('verified');
  });
  it('GPS inside the geofence is verified', () => {
    const r = evaluateCapture({ source: 'gps', branch: branch(), gps: { lat: 22.5958, lng: 88.3639 } });
    expect(r.verificationStatus).toBe('verified');
    expect(r.distanceMetres).toBeLessThanOrEqual(80);
  });
  it('GPS outside the geofence goes to review, with distance', () => {
    const r = evaluateCapture({ source: 'gps', branch: branch(), gps: { lat: 22.61, lng: 88.4 } });
    expect(r.verificationStatus).toBe('needs_review');
    expect(r.reason).toMatch(/geofence/i);
    expect(r.distanceMetres).toBeGreaterThan(80);
  });
  it('GPS denied / unavailable goes to review (not a hard fail)', () => {
    expect(evaluateCapture({ source: 'gps', branch: branch(), gpsDenied: true }).verificationStatus).toBe('needs_review');
    expect(evaluateCapture({ source: 'gps', branch: branch(), gps: null }).reason).toMatch(/unavailable|denied/i);
  });
  it('a manager-approval branch always reviews', () => {
    expect(evaluateCapture({ source: 'kiosk', branch: branch({ managerApprovalRequired: true }) }).verificationStatus).toBe('needs_review');
  });
});

import type { AttendanceRecord, ProofFactors, ProofMethod } from '../types';
import { BRANCHES } from './branches';
import { evaluateProof, isAutoApproved } from '../services/attendance';

interface RawCheckin {
  employeeId: string;
  employeeName: string;
  branch: string;
  time: string;
  method: ProofMethod;
  factors: ProofFactors;
}

const RAW: RawCheckin[] = [
  {
    employeeId: 'GNG-BD-0142', employeeName: 'Subir Maity', branch: 'Beadon Street', time: '9:02 AM', method: 'qr',
    factors: { qrMatched: true, gpsInsideRadius: true, wifiMatched: true, selfieCaptured: false, managerApproved: false },
  },
  {
    employeeId: 'GNG-MH-0088', employeeName: 'Rina Das', branch: 'Mishti Hub', time: '9:11 AM', method: 'gps',
    factors: { qrMatched: false, gpsInsideRadius: true, wifiMatched: false, selfieCaptured: true, managerApproved: false },
  },
  {
    employeeId: 'GNG-BD-0061', employeeName: 'Mou Pal', branch: 'Beadon Street', time: '9:18 AM', method: 'qr',
    factors: { qrMatched: true, gpsInsideRadius: true, wifiMatched: true, selfieCaptured: false, managerApproved: false },
  },
  {
    employeeId: 'GNG-BD-0177', employeeName: 'Kartik Sen', branch: 'Beadon Street', time: '9:25 AM', method: 'kiosk',
    factors: { qrMatched: false, gpsInsideRadius: false, wifiMatched: false, selfieCaptured: true, managerApproved: true },
  },
  {
    employeeId: 'GNG-BN-0203', employeeName: 'Amit Ghosh', branch: 'Baranagar', time: '9:34 AM', method: 'selfie',
    factors: { qrMatched: false, gpsInsideRadius: false, wifiMatched: false, selfieCaptured: true, managerApproved: false },
  },
  {
    employeeId: 'GNG-DK-0156', employeeName: 'Pooja Roy', branch: 'Dakshineshwar', time: '9:40 AM', method: 'qr',
    factors: { qrMatched: true, gpsInsideRadius: false, wifiMatched: true, selfieCaptured: false, managerApproved: false },
  },
];

export const CHECKINS: AttendanceRecord[] = RAW.map((r, i) => {
  const branch = BRANCHES.find((b) => b.name === r.branch);
  const strength = evaluateProof(r.factors);
  return {
    id: `chk-${i + 1}`,
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    branch: r.branch,
    date: '14 Mar 2026',
    time: r.time,
    method: r.method,
    factors: r.factors,
    strength,
    approved: branch ? isAutoApproved(branch, r.factors) : false,
  };
});

/* ============================================================
   Employee / Manager PIN login — DEMO / LOCAL ONLY (Phase 3A, Step 1)

   This is the CLIENT-SIDE scaffold for PIN login. It is intentionally NOT
   production-secure: it only matches an existing employee record and checks the
   PIN *format*. No PIN is stored anywhere, and no plain PIN is ever written to
   Firestore.

   TODO(backend, Phase 3B) — the real secure flow:
     1. Employee enters mobile / employeeCode + PIN.
     2. A Cloud Function looks up the appUsers record and verifies the PIN against
        a server-side salted hash (bcrypt / scrypt / argon2). The plain PIN is
        never stored, and verification never happens on the client.
     3. On success the function mints a Firebase custom token carrying role +
        branch claims (admin / manager / employee).
     4. The client signs in with that token; Firestore rules then gate every read
        and write by request.auth.uid + custom claims:
          - admin   → full access
          - manager → only their assigned branch's data
          - employee→ only their own documents
     5. Failed attempts / lockouts are enforced server-side (the client counter
        below is a UX placeholder only).
   ============================================================ */
import type { Employee } from '../types';

/** After this many failed attempts the login is (demo-)locked. */
export const MAX_PIN_ATTEMPTS = 5;

/** Obvious / sequential PINs that must be rejected (4- and 6-digit). */
const WEAK_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '2580', '1212',
  '000000', '111111', '222222', '999999', '123456', '654321', '121212', '112233',
]);

export interface PinValidation {
  ok: boolean;
  message?: string;
}

/** A PIN must be exactly 4 or 6 digits and not an easily-guessed sequence.
 *  6 digits is recommended for managers (enforced by the caller). */
export function validatePin(pin: string): PinValidation {
  if (!/^\d+$/.test(pin)) return { ok: false, message: 'PIN must be digits only.' };
  if (pin.length !== 4 && pin.length !== 6) return { ok: false, message: 'PIN must be 4 or 6 digits.' };
  if (WEAK_PINS.has(pin)) return { ok: false, message: 'That PIN is too easy to guess — choose another.' };
  return { ok: true };
}

export function isWeakPin(pin: string): boolean {
  return WEAK_PINS.has(pin);
}

/** Reduce a phone/identifier to comparable digits. */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Match the employee a manager/employee is signing in as, by employee
 *  code / ID or mobile number. Returns undefined when nothing matches.
 *  (employeeCode == the employee document id in this app.) */
export function findLoginUser(employees: Employee[], identifier: string): Employee | undefined {
  const q = identifier.trim().toLowerCase();
  if (!q) return undefined;
  const qDigits = digitsOnly(identifier);
  return employees.find((e) => {
    const id = e.id.toLowerCase();
    if (id === q) return true;
    if (q.length >= 3 && id.endsWith(q)) return true; // allow entering just the trailing code, e.g. 0142
    // Mobile match on the last 10 digits, so "+91 98300 11422" and "9830011422" both work.
    if (qDigits.length >= 10 && e.phone && digitsOnly(e.phone).slice(-10) === qDigits.slice(-10)) return true;
    return false;
  });
}

export type LoginOutcome =
  | { ok: true; employee: Employee }
  | { ok: false; reason: 'not_found' | 'disabled' | 'bad_pin'; message: string };

/** DEMO verification: match the record + validate PIN format only.
 *  TODO(backend): replace with a Cloud Function that verifies the PIN hash and
 *  returns a Firebase custom token — never accept a PIN on format alone. */
export function verifyPinLogin(employees: Employee[], identifier: string, pin: string): LoginOutcome {
  const employee = findLoginUser(employees, identifier);
  if (!employee) return { ok: false, reason: 'not_found', message: 'No matching employee record. Check your ID / mobile or contact your admin.' };
  if (employee.login !== 'enabled') return { ok: false, reason: 'disabled', message: 'Portal login is not enabled for this account yet. Contact your admin.' };
  const v = validatePin(pin);
  if (!v.ok) return { ok: false, reason: 'bad_pin', message: v.message ?? 'Invalid PIN.' };
  return { ok: true, employee };
}

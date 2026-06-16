/* ============================================================
   Portal access helpers (Phase 3A, Step 2)

   Normalises an employee's admin-managed login controls and derives the
   display login status. No PIN (plain or hashed) is stored — see pinAuth.ts.
   ============================================================ */
import type { Employee, PortalAccess, PortalLoginStatus, PortalRole } from '../types';
import type { BadgeVariant } from '../components/ui';

/** Is the account currently locked (lock window still in the future)? */
export function isAccountLocked(a: Pick<PortalAccess, 'lockedUntil'>): boolean {
  return !!a.lockedUntil && a.lockedUntil > Date.now();
}

/** Derive the display login status from the primitive fields. */
export function loginStatusOf(a: Omit<PortalAccess, 'loginStatus'>): PortalLoginStatus {
  if (!a.loginEnabled) return 'disabled';
  if (isAccountLocked(a)) return 'locked';
  if (!a.pinSet) return 'pin_required';
  return 'active';
}

/** Infer a default portal role from an employee's job-role text. */
function inferRole(emp: Employee): PortalRole {
  return /manager/i.test(emp.role) && !/vice/i.test(emp.role) ? 'manager' : 'employee';
}

/** Normalised portal access for an employee, deriving sensible defaults from
 *  legacy fields when the dedicated object is absent (backward compatible). */
export function portalAccessOf(emp: Employee): PortalAccess {
  const existing = emp.portalAccess;
  const loginEnabled = existing?.loginEnabled ?? emp.login === 'enabled';
  const base = {
    loginEnabled,
    // Legacy enabled accounts are treated as having a PIN so demo login keeps
    // working; a fresh account that an admin enables starts pin_required.
    pinSet: existing?.pinSet ?? loginEnabled,
    portalRole: existing?.portalRole ?? inferRole(emp),
    failedAttempts: existing?.failedAttempts ?? 0,
    lockedUntil: existing?.lockedUntil ?? null,
    lastLoginAt: existing?.lastLoginAt ?? (emp.lastLogin && emp.lastLogin !== 'Never' ? emp.lastLogin : null),
    loginNotes: existing?.loginNotes,
    managerBranchId: existing?.managerBranchId ?? null,
    managerBranchCode: existing?.managerBranchCode ?? null,
    passwordFallbackAllowed: existing?.passwordFallbackAllowed ?? true,
  };
  return { ...base, loginStatus: loginStatusOf(base) };
}

/** True when a manager account still needs a branch assignment. */
export function managerNeedsBranch(a: PortalAccess): boolean {
  return a.portalRole === 'manager' && !a.managerBranchCode;
}

export const PORTAL_STATUS_META: Record<PortalLoginStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'present' },
  disabled: { label: 'Login disabled', variant: 'locked' },
  locked: { label: 'Locked', variant: 'rejected' },
  pin_required: { label: 'PIN required', variant: 'pending' },
};

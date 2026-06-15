/* ============================================================
   Branch selection + matching helpers.

   The single source of truth for branches is the live store (Firestore once
   configured, seed/localStorage in demo) — NEVER the seed `BRANCH_NAMES`
   constant. Selectors and filters build their options from the live list and
   match employees to a branch by the stable Firestore `branchCode`, falling
   back to the branch name so older/manually-added records still resolve.
   ============================================================ */
import type { Branch, Employee } from '../types';

/** Active, non-archived branches — the only ones offered in selectors. */
export function activeBranches(branches: Branch[]): Branch[] {
  return branches.filter((b) => !b.archived && b.status === 'active');
}

/** Active branch names, for selectors that assign a branch by name
 *  (employee form, kiosk). */
export function activeBranchNames(branches: Branch[]): string[] {
  return activeBranches(branches).map((b) => b.name);
}

/** Options for a branch filter <Select>: "All branches" (value '') followed by
 *  each active branch (value = stable code, label = name). */
export function branchFilterOptions(branches: Branch[]): { value: string; label: string }[] {
  return [{ value: '', label: 'All branches' }, ...activeBranches(branches).map((b) => ({ value: b.code, label: b.name }))];
}

/** Display name for a selected branch filter value (code), or "All branches". */
export function branchNameForFilter(code: string, branches: Branch[]): string {
  if (!code) return 'All branches';
  return branches.find((b) => b.code === code)?.name ?? code;
}

/** Does the employee belong to the branch identified by `code`?
 *  '' (All) matches everyone; otherwise match by Firestore branchCode or name. */
export function employeeInBranch(e: Pick<Employee, 'branch' | 'branchCode'>, code: string, branches: Branch[]): boolean {
  if (!code) return true;
  const branch = branches.find((b) => b.code === code);
  return e.branchCode === code || (!!branch && e.branch === branch.name);
}

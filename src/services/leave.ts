/* ============================================================
   Leave request paid/unpaid logic.

   The first `freeLeaveAllowed` (4 when eligible, else 0) leave days in the
   month are paid/free; everything above is unpaid/deductible. Requests are
   allocated in chronological order so earlier leave consumes the bucket first.
   ============================================================ */

export interface LeaveAllocation {
  paidDays: number;
  deductibleDays: number;
  /** True when at least one day of this request is paid. */
  paid: boolean;
}

export interface AllocatableLeave {
  days: number;
  /** Only approved leave consumes the paid bucket; pending/rejected do not. */
  status?: 'pending' | 'approved' | 'rejected';
}

/**
 * Allocate the monthly free-leave bucket across requests in order.
 * Pending/rejected requests are projected (shown as if approved) but, by
 * default, only approved leave consumes the bucket.
 */
export function allocatePaidLeave(
  requests: AllocatableLeave[],
  freeLeaveAllowed: number,
  opts: { consumeApprovedOnly?: boolean } = {},
): LeaveAllocation[] {
  const consumeApprovedOnly = opts.consumeApprovedOnly ?? true;
  let remaining = freeLeaveAllowed;

  return requests.map((req) => {
    const consumes = !consumeApprovedOnly || req.status === 'approved' || req.status === undefined;
    if (!consumes) {
      // Projected as fully deductible unless the bucket would cover it.
      const projectedPaid = Math.min(req.days, remaining);
      return { paidDays: projectedPaid, deductibleDays: req.days - projectedPaid, paid: projectedPaid > 0 };
    }
    const paidDays = Math.max(0, Math.min(req.days, remaining));
    remaining -= paidDays;
    return { paidDays, deductibleDays: req.days - paidDays, paid: paidDays > 0 };
  });
}

/** Total deductible leave days for the month given eligibility. */
export function deductibleLeaveDays(leaveUsed: number, freeLeaveAllowed: number): number {
  return Math.max(0, leaveUsed - freeLeaveAllowed);
}

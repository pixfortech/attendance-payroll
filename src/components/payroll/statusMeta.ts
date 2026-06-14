import type { BadgeVariant } from '../ui';
import type { ConfirmationStatus, PayrollStatus, ProofStrength } from '../../types';

/** Payment confirmation status → badge variant + label. */
export const CONFIRMATION_META: Record<ConfirmationStatus, { variant: BadgeVariant; label: string }> = {
  confirmed: { variant: 'confirmed', label: 'Confirmed by employee' },
  pending: { variant: 'pending', label: 'Pending confirmation' },
  disputed: { variant: 'disputed', label: 'Disputed / issue raised' },
};

/** Monthly payroll-run status → badge variant + label. */
export const PAYROLL_STATUS_META: Record<PayrollStatus, { variant: BadgeVariant; label: string }> = {
  pending: { variant: 'pending', label: 'Pending' },
  approved: { variant: 'approved', label: 'Approved' },
  paid: { variant: 'paid', label: 'Paid' },
  hold: { variant: 'rejected', label: 'On hold' },
};

/** Attendance proof strength → badge variant + label. */
export const PROOF_META: Record<ProofStrength, { variant: BadgeVariant; label: string }> = {
  strong: { variant: 'confirmed', label: 'Strong proof' },
  medium: { variant: 'approved', label: 'Medium proof' },
  needs_approval: { variant: 'pending', label: 'Needs approval' },
};

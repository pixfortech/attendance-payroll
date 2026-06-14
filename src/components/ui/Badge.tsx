import { type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type BadgeVariant =
  | 'paid' | 'present' | 'success' | 'pending' | 'warning' | 'half'
  | 'confirmed' | 'eligible' | 'approved' | 'info' | 'leave'
  | 'rejected' | 'danger' | 'absent' | 'deductible' | 'disputed'
  | 'locked' | 'noteligible' | 'brand' | 'neutral';

export interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  icon?: IconName | null;
  dot?: boolean;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

type Triplet = { fg: string; bg: string; bd: string };

const PAID: Triplet = { fg: 'var(--status-paid-fg)', bg: 'var(--status-paid-bg)', bd: 'var(--status-paid-bd)' };
const PENDING: Triplet = { fg: 'var(--status-pending-fg)', bg: 'var(--status-pending-bg)', bd: 'var(--status-pending-bd)' };
const APPROVED: Triplet = { fg: 'var(--status-approved-fg)', bg: 'var(--status-approved-bg)', bd: 'var(--status-approved-bd)' };
const REJECTED: Triplet = { fg: 'var(--status-rejected-fg)', bg: 'var(--status-rejected-bg)', bd: 'var(--status-rejected-bd)' };
const MUTED: Triplet = { fg: 'var(--neutral-600)', bg: 'var(--neutral-100)', bd: 'var(--neutral-300)' };

/** Status & category badge. Soft tonal fill, optional leading dot or icon. */
export function Badge({ children, variant = 'neutral', icon = null, dot = false, size = 'md', style = {} }: BadgeProps) {
  const map: Record<BadgeVariant, Triplet> = {
    paid: PAID, present: PAID, success: PAID, confirmed: PAID, eligible: PAID,
    pending: PENDING, warning: PENDING, half: PENDING,
    approved: APPROVED, info: APPROVED, leave: APPROVED,
    rejected: REJECTED, danger: REJECTED, absent: REJECTED, deductible: REJECTED, disputed: REJECTED,
    locked: MUTED, noteligible: MUTED,
    brand: { fg: 'var(--indigo-700)', bg: 'var(--indigo-50)', bd: 'var(--indigo-100)' },
    neutral: { fg: 'var(--status-neutral-fg)', bg: 'var(--status-neutral-bg)', bd: 'var(--status-neutral-bd)' },
  };
  const c = map[variant];
  const sm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sm ? 4 : 5,
        padding: sm ? '2px 8px' : '4px 10px',
        fontSize: sm ? 11 : 12,
        fontWeight: 600,
        lineHeight: 1.4,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.bd}`,
        borderRadius: 'var(--radius-pill)',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg, flexShrink: 0 }} />}
      {icon && <Icon name={icon} size={sm ? 12 : 13} />}
      {children}
    </span>
  );
}

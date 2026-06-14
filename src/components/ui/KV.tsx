import { type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface KVProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  icon?: IconName;
  valueColor?: string;
}

/** Key/value display block used across employee detail panels. */
export function KV({ label, value, mono, icon, valueColor }: KVProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 0' }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <Icon name={icon} size={13} color="var(--text-subtle)" />}
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: valueColor || 'var(--text-strong)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)' }}>{value}</span>
    </div>
  );
}

export interface SectionLabelProps {
  children: ReactNode;
  action?: ReactNode;
}

/** Uppercase eyebrow section label with optional trailing action. */
export function SectionLabel({ children, action }: SectionLabelProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{children}</span>
      {action}
    </div>
  );
}

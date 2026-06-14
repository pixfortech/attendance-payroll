import { type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';

export interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/** Centered overlay modal with dimmed, blurred backdrop. */
export function Modal({ title, subtitle, icon, onClose, children, footer, width = 460 }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,34,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="gx-scroll"
        style={{
          width,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          {icon && (
            <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={19} />
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-inset)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

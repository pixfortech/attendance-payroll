import { type CSSProperties } from 'react';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

/** Toggle switch for policy settings (e.g. 30-day vs calendar-day basis). */
export function Switch({ checked = false, onChange, label, description, disabled = false, size = 'md', style = {} }: SwitchProps) {
  const dims = size === 'sm' ? { w: 36, h: 20, k: 14 } : { w: 44, h: 24, k: 18 };
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: dims.w,
          height: dims.h,
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--brand-primary)' : 'var(--neutral-300)',
          position: 'relative',
          transition: 'background var(--dur-base) var(--ease-out)',
          marginTop: description ? 2 : 0,
          boxShadow: 'var(--shadow-inset)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: (dims.h - dims.k) / 2,
            left: checked ? dims.w - dims.k - (dims.h - dims.k) / 2 : (dims.h - dims.k) / 2,
            width: dims.k,
            height: dims.k,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left var(--dur-base) var(--ease-spring)',
          }}
        />
      </span>
      {(label || description) && (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {label && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', lineHeight: 1.3 }}>{label}</span>}
          {description && <span style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>{description}</span>}
        </span>
      )}
    </label>
  );
}

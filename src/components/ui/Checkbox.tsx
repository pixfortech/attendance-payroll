import { type CSSProperties } from 'react';
import { Icon } from './Icon';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: CSSProperties;
}

/** Checkbox with label. Controlled via `checked` + `onChange(next)`. */
export function Checkbox({ checked = false, onChange, label, description, disabled = false, style = {} }: CheckboxProps) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          borderRadius: 'var(--radius-xs)',
          border: `1.5px solid ${checked ? 'var(--brand-primary)' : 'var(--border-strong)'}`,
          background: checked ? 'var(--brand-primary)' : 'var(--surface-card)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--dur-fast) var(--ease-out)',
          marginTop: description ? 1 : 0,
          boxShadow: checked ? 'var(--shadow-xs)' : 'none',
        }}
      >
        {checked && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
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

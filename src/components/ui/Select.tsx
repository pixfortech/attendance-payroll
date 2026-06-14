import React, { type CSSProperties } from 'react';
import { Icon } from './Icon';

export type SelectOption = string | { value: string; label: string };

export interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options?: SelectOption[];
  placeholder?: string;
  hint?: string | null;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  style?: CSSProperties;
}

/** Styled native select with label + chevron. */
export function Select({ label, value, onChange, options = [], placeholder, hint = null, disabled = false, required = false, id, style = {} }: SelectProps) {
  const [focus, setFocus] = React.useState(false);
  const selId = id || (label ? 'sel-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label htmlFor={selId} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', letterSpacing: '-0.01em' }}>
          {label}
          {required && <span style={{ color: 'var(--coral-500)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          id={selId}
          {...(onChange ? { value, onChange } : { defaultValue: value })}
          disabled={disabled}
          required={required}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            width: '100%',
            height: 42,
            padding: '0 38px 0 12px',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 500,
            color: value ? 'var(--text-strong)' : 'var(--text-subtle)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled ? 'var(--neutral-100)' : 'var(--surface-card)',
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: focus ? 'var(--brand-primary)' : 'var(--border-default)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            boxShadow: focus ? '0 0 0 3px var(--ring-focus)' : 'var(--shadow-xs)',
            transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
          }}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: 12, pointerEvents: 'none', color: 'var(--text-muted)', display: 'flex' }}>
          <Icon name="chevronDown" size={17} />
        </span>
      </div>
      {hint && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</span>}
    </div>
  );
}

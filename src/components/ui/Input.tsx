import React, { type CSSProperties } from 'react';
import { Icon, type IconName } from './Icon';

export interface InputProps {
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  icon?: IconName | null;
  prefix?: string | null;
  suffix?: string | null;
  hint?: string | null;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  mono?: boolean;
  id?: string;
  style?: CSSProperties;
}

/** Labelled text input with optional leading icon, prefix (e.g. ₹), hint and error. */
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon = null,
  prefix = null,
  suffix = null,
  hint = null,
  error = null,
  disabled = false,
  required = false,
  mono = false,
  id,
  style = {},
}: InputProps) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? 'in-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const borderColor = error ? 'var(--coral-500)' : focus ? 'var(--brand-primary)' : 'var(--border-default)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', letterSpacing: '-0.01em' }}>
          {label}
          {required && <span style={{ color: 'var(--coral-500)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: disabled ? 'var(--neutral-100)' : 'var(--surface-card)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor,
          borderRadius: 'var(--radius-md)',
          padding: '0 12px',
          height: 42,
          boxShadow: focus ? `0 0 0 3px ${error ? 'var(--status-rejected-bd)' : 'var(--ring-focus)'}` : 'var(--shadow-xs)',
          transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
        }}
      >
        {icon && <Icon name={icon} size={17} color="var(--text-subtle)" />}
        {prefix && <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 14 }}>{prefix}</span>}
        <input
          id={inputId}
          type={type}
          {...(onChange ? { value, onChange } : { defaultValue: value })}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            minWidth: 0,
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: 14,
            color: 'var(--text-strong)',
            fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
          }}
        />
        {suffix && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 13 }}>{suffix}</span>}
      </div>
      {(hint || error) && (
        <span style={{ fontSize: 12, color: error ? 'var(--coral-600)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
          {error && <Icon name="alert" size={13} />}
          {error || hint}
        </span>
      )}
    </div>
  );
}

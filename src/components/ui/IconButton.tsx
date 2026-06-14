import React, { type CSSProperties } from 'react';
import { Icon, type IconName } from './Icon';

export type IconButtonVariant = 'ghost' | 'secondary' | 'tonal' | 'primary';

export interface IconButtonProps {
  icon: IconName;
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
}

/** Square icon-only button. Pairs with the built-in Icon set. */
export function IconButton({ icon, label, variant = 'ghost', size = 'md', disabled = false, onClick, style = {} }: IconButtonProps) {
  const sizes: Record<string, number> = { sm: 30, md: 36, lg: 42 };
  const iconSizes: Record<string, number> = { sm: 16, md: 18, lg: 20 };
  const dim = sizes[size];

  const variants: Record<IconButtonVariant, { background: string; color: string; border: string; hover: string }> = {
    ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent', hover: 'var(--neutral-100)' },
    secondary: { background: 'var(--surface-card)', color: 'var(--text-body)', border: '1px solid var(--border-default)', hover: 'var(--neutral-50)' },
    tonal: { background: 'var(--brand-primary-soft)', color: 'var(--indigo-700)', border: '1px solid var(--indigo-100)', hover: 'var(--indigo-100)' },
    primary: { background: 'var(--brand-primary)', color: '#fff', border: '1px solid var(--brand-primary)', hover: 'var(--brand-primary-hover)' },
  };
  const v = variants[variant];
  const [hover, setHover] = React.useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: dim,
        height: dim,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: hover && !disabled ? v.hover : v.background,
        color: v.color,
        border: v.border,
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--dur-fast) var(--ease-out)',
        padding: 0,
        ...style,
      }}
    >
      <Icon name={icon} size={iconSizes[size]} />
    </button>
  );
}

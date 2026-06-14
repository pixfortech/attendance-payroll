import React, { type CSSProperties, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'accent' | 'tonal' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
  loading?: boolean;
  style?: CSSProperties;
}

/** Primary action button. Indigo by default; coral for the single key action. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  full = false,
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}: ButtonProps) {
  const sizes: Record<ButtonSize, { padding: string; fontSize: number; gap: number; radius: string; icon: number }> = {
    sm: { padding: '7px 12px', fontSize: 13, gap: 6, radius: 'var(--radius-sm)', icon: 15 },
    md: { padding: '10px 18px', fontSize: 14, gap: 8, radius: 'var(--radius-md)', icon: 17 },
    lg: { padding: '13px 24px', fontSize: 15, gap: 9, radius: 'var(--radius-md)', icon: 19 },
  };
  const s = sizes[size];

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: { background: 'var(--brand-primary)', color: 'var(--text-on-brand)', border: '1px solid var(--brand-primary)', boxShadow: 'var(--shadow-sm)' },
    accent: { background: 'var(--brand-accent)', color: 'var(--text-on-accent)', border: '1px solid var(--brand-accent)', boxShadow: 'var(--shadow-sm)' },
    tonal: { background: 'var(--brand-primary-soft)', color: 'var(--indigo-700)', border: '1px solid var(--indigo-100)', boxShadow: 'none' },
    secondary: { background: 'var(--surface-card)', color: 'var(--text-body)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xs)' },
    ghost: { background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent', boxShadow: 'none' },
    danger: { background: 'var(--coral-600)', color: '#fff', border: '1px solid var(--coral-600)', boxShadow: 'var(--shadow-sm)' },
  };
  const v = variants[variant];

  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const isDisabled = disabled || loading;

  const hoverBg: Record<ButtonVariant, string> = {
    primary: 'var(--brand-primary-hover)',
    accent: 'var(--brand-accent-hover)',
    tonal: 'var(--indigo-100)',
    secondary: 'var(--neutral-50)',
    ghost: 'var(--neutral-100)',
    danger: 'var(--coral-700)',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: full ? 'flex' : 'inline-flex',
        width: full ? '100%' : 'auto',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        letterSpacing: '-0.01em',
        borderRadius: s.radius,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        opacity: isDisabled ? 0.5 : 1,
        transform: press && !isDisabled ? 'translateY(0.5px) scale(0.985)' : 'none',
        ...v,
        background: hover && !isDisabled ? hoverBg[variant] : v.background,
        ...style,
      }}
      {...rest}
    >
      {loading && (
        <span
          style={{
            width: s.icon - 3,
            height: s.icon - 3,
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            display: 'inline-block',
            animation: 'gx-spin 0.7s linear infinite',
          }}
        />
      )}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}

import React, { type CSSProperties, type ReactNode } from 'react';

export interface CardProps {
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  padding?: string | number;
  accent?: boolean;
  hover?: boolean;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  className?: string;
}

/** Surface container. The base building block for every panel in the suite. */
export function Card({
  children,
  title,
  subtitle,
  action,
  padding = 'var(--pad-card)',
  accent = false,
  hover = false,
  style = {},
  bodyStyle = {},
  className,
}: CardProps) {
  const [h, setH] = React.useState(false);
  const hasHeader = title != null || action != null;
  return (
    <section
      className={className}
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: h ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        borderTop: accent ? '3px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
        transition: 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
        transform: h ? 'translateY(-2px)' : 'none',
        overflow: 'hidden',
        ...style,
      }}
    >
      {hasHeader && (
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {title && <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding: hasHeader ? '20px' : padding, ...bodyStyle }}>{children}</div>
    </section>
  );
}

import React, { type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type ChipKind = 'variable' | 'operator' | 'number' | 'filter' | 'plain';

export interface ChipProps {
  children?: ReactNode;
  kind?: ChipKind;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
  active?: boolean;
  icon?: IconName | null;
  title?: string;
  style?: CSSProperties;
}

/** Clickable chip — used heavily in the formula builder for variables & operators. */
export function Chip({ children, kind = 'variable', onClick, removable = false, onRemove, active = false, icon = null, title, style = {} }: ChipProps) {
  const kinds: Record<ChipKind, { fg: string; bg: string; bd: string; hover: string; mono: boolean }> = {
    variable: { fg: 'var(--indigo-700)', bg: 'var(--indigo-50)', bd: 'var(--indigo-100)', hover: 'var(--indigo-100)', mono: true },
    operator: { fg: 'var(--coral-700)', bg: 'var(--coral-50)', bd: 'var(--coral-100)', hover: 'var(--coral-100)', mono: true },
    number: { fg: 'var(--neutral-700)', bg: 'var(--neutral-100)', bd: 'var(--neutral-200)', hover: 'var(--neutral-200)', mono: true },
    filter: { fg: 'var(--text-body)', bg: 'var(--surface-card)', bd: 'var(--border-default)', hover: 'var(--neutral-50)', mono: false },
    plain: { fg: 'var(--neutral-600)', bg: 'var(--neutral-100)', bd: 'var(--neutral-200)', hover: 'var(--neutral-200)', mono: false },
  };
  const k = kinds[kind];
  const [h, setH] = React.useState(false);
  const interactive = !!onClick || removable;

  return (
    <span
      onClick={onClick}
      title={title}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: removable ? '5px 6px 5px 11px' : '6px 11px',
        fontSize: 13,
        fontWeight: k.mono ? 500 : 600,
        fontFamily: k.mono ? 'var(--font-mono)' : 'var(--font-sans)',
        color: active ? '#fff' : k.fg,
        background: active ? 'var(--brand-primary)' : h && interactive ? k.hover : k.bg,
        border: `1px solid ${active ? 'var(--brand-primary)' : k.bd}`,
        borderRadius: 'var(--radius-sm)',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        transition: 'background var(--dur-fast), color var(--dur-fast)',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
      {removable && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove && onRemove();
          }}
          style={{ display: 'inline-flex', borderRadius: '50%', padding: 2, color: 'currentColor', opacity: 0.6 }}
        >
          <Icon name="x" size={12} strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}

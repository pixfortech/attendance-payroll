import { type CSSProperties } from 'react';
import { Icon, type IconName } from './Icon';

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
  style?: CSSProperties;
}

/** Tab switcher. Controlled via value + onChange. */
export function Tabs({ items, value, onChange, variant = 'underline', style = {} }: TabsProps) {
  const activeId = value ?? items[0]?.id;

  if (variant === 'pill') {
    return (
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', ...style }}>
        {items.map((it) => {
          const on = it.id === activeId;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange && onChange(it.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 14px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
                color: on ? 'var(--indigo-700)' : 'var(--text-muted)',
                background: on ? 'var(--surface-card)' : 'transparent',
                boxShadow: on ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {it.icon && <Icon name={it.icon} size={16} />}
              {it.label}
              {it.count != null && <Counter on={on}>{it.count}</Counter>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', ...style }}>
      {items.map((it) => {
        const on = it.id === activeId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange && onChange(it.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '11px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: on ? 'var(--brand-primary)' : 'var(--text-muted)',
              borderBottomWidth: 2,
              borderBottomStyle: 'solid',
              borderBottomColor: on ? 'var(--brand-primary)' : 'transparent',
              marginBottom: -1,
            }}
          >
            {it.icon && <Icon name={it.icon} size={16} />}
            {it.label}
            {it.count != null && <Counter on={on}>{it.count}</Counter>}
          </button>
        );
      })}
    </div>
  );
}

function Counter({ children, on }: { children: number; on: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '1px 7px',
        borderRadius: 'var(--radius-pill)',
        background: on ? 'var(--indigo-100)' : 'var(--neutral-200)',
        color: on ? 'var(--indigo-700)' : 'var(--text-muted)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {children}
    </span>
  );
}

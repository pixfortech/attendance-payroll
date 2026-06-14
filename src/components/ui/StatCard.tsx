import React, { type CSSProperties } from 'react';
import { Icon, type IconName } from './Icon';

export type StatTone = 'brand' | 'green' | 'amber' | 'blue' | 'coral' | 'neutral';

export interface StatCardProps {
  label: string;
  value: string | number;
  prefix?: string | null;
  suffix?: string | null;
  icon?: IconName | null;
  tone?: StatTone;
  delta?: string | null;
  deltaDir?: 'up' | 'down';
  footnote?: string | null;
  onClick?: () => void;
  style?: CSSProperties;
}

/** KPI metric card — big figure, label, icon chip and optional delta. */
export function StatCard({
  label,
  value,
  prefix = null,
  suffix = null,
  icon = null,
  tone = 'brand',
  delta = null,
  deltaDir = 'up',
  footnote = null,
  onClick,
  style = {},
}: StatCardProps) {
  const [hover, setHover] = React.useState(false);
  const tones: Record<StatTone, { fg: string; bg: string }> = {
    brand: { fg: 'var(--indigo-700)', bg: 'var(--indigo-50)' },
    green: { fg: 'var(--green-700)', bg: 'var(--green-50)' },
    amber: { fg: 'var(--amber-700)', bg: 'var(--amber-50)' },
    blue: { fg: 'var(--blue-700)', bg: 'var(--blue-50)' },
    coral: { fg: 'var(--coral-700)', bg: 'var(--coral-50)' },
    neutral: { fg: 'var(--neutral-700)', bg: 'var(--neutral-100)' },
  };
  const t = tones[tone];
  const up = deltaDir === 'up';

  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick!() : undefined}
      onMouseEnter={() => clickable && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: clickable ? 'pointer' : 'default',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>{label}</span>
        {icon && (
          <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: t.bg, color: t.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={19} />
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontFamily: 'var(--font-sans)' }}>
        {prefix && <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)' }}>{prefix}</span>}
        <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {suffix && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>{suffix}</span>}
      </div>
      {(delta || footnote) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {delta && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 12,
                fontWeight: 700,
                color: up ? 'var(--green-700)' : 'var(--coral-700)',
                background: up ? 'var(--green-50)' : 'var(--coral-50)',
                padding: '2px 7px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <Icon name={up ? 'trendUp' : 'trendDown'} size={13} />
              {delta}
            </span>
          )}
          {footnote && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{footnote}</span>}
        </div>
      )}
    </div>
  );
}

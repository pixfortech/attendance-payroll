import { type CSSProperties } from 'react';

export type ProgressTone = 'brand' | 'green' | 'amber' | 'coral' | 'blue';

export interface ProgressBarProps {
  value?: number;
  max?: number;
  tone?: ProgressTone;
  height?: number;
  label?: string | null;
  showValue?: boolean;
  valueText?: string | null;
  style?: CSSProperties;
}

/** Slim progress / ratio bar — attendance %, leave usage, payroll completion. */
export function ProgressBar({ value = 0, max = 100, tone = 'brand', height = 8, label = null, showValue = false, valueText = null, style = {} }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tones: Record<ProgressTone, string> = {
    brand: 'var(--brand-primary)',
    green: 'var(--green-500)',
    amber: 'var(--amber-500)',
    coral: 'var(--coral-500)',
    blue: 'var(--blue-500)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)' }}>{label}</span>}
          {showValue && (
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
              {valueText ?? `${Math.round(pct)}%`}
            </span>
          )}
        </div>
      )}
      <div style={{ width: '100%', height, background: 'var(--neutral-200)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: tones[tone],
            borderRadius: 'var(--radius-pill)',
            transition: 'width var(--dur-slow) var(--ease-out)',
          }}
        />
      </div>
    </div>
  );
}

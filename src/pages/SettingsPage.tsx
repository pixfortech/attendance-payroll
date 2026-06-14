import { useState } from 'react';
import { Badge, Card, Icon, Switch } from '../components/ui';
import { FIXED_POLICY_DAYS } from '../services/salary';
import { FREE_LEAVE_PER_MONTH, MIN_TENURE_MONTHS, MIN_WORKED_DAYS } from '../services/eligibility';

function PolicyRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--indigo-700)' }}>{value}</span>
    </div>
  );
}

const SWATCHES: [string, string][] = [
  ['Primary', '#49488D'],
  ['Accent', '#EA5454'],
  ['White', '#FFFFFF'],
];

export function SettingsPage() {
  const [defaultBasis30, setDefaultBasis30] = useState(true);
  const [halfTiffin, setHalfTiffin] = useState(true);
  const [autoPaidLeave, setAutoPaidLeave] = useState(true);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      <Card title="Salary policy" subtitle="Defaults applied across the payroll run">
        <div style={{ marginBottom: 8 }}>
          <Switch
            checked={defaultBasis30}
            onChange={setDefaultBasis30}
            label={`Default basis: ${defaultBasis30 ? 'Fixed 30-day' : 'Actual calendar-day'}`}
            description="A new joiner's first month always uses calendar-day logic regardless of this setting"
          />
        </div>
        <PolicyRow label="Fixed policy days" value={`${FIXED_POLICY_DAYS} days`} hint="Divisor for the fixed-day daily rate" />
        <PolicyRow label="Free paid leaves / month" value={`${FREE_LEAVE_PER_MONTH} days`} hint="Strictly monthly · never carried forward" />
        <PolicyRow label="Eligibility — tenure" value={`${MIN_TENURE_MONTHS} months`} hint="Minimum tenure for free leave" />
        <PolicyRow label="Eligibility — worked days" value={`${MIN_WORKED_DAYS} days`} hint="Exactly 15 counts as eligible" />
        <div style={{ marginTop: 14 }}>
          <Switch checked={autoPaidLeave} onChange={setAutoPaidLeave} label="Auto-calculate paid / unpaid leave" description="First 4 eligible days paid; the rest deductible" />
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Tiffin / food allowance" subtitle="Company-paid CTC defaults">
          <Switch checked={halfTiffin} onChange={setHalfTiffin} label="Half-day tiffin eligible by default" description="Pay 50% allowance on half-day attendance" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', marginTop: 14 }}>
            <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
            Tiffin is never a deduction and is paid on top of salary. No tiffin on paid-leave days.
          </div>
        </Card>

        <Card title="Brand & appearance" subtitle="Ganguram identity">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {SWATCHES.map(([name, hex]) => (
              <div key={name} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 48, borderRadius: 'var(--radius-md)', background: hex, border: '1px solid var(--border-subtle)' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-strong)', marginTop: 6 }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{hex}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--text-body)' }}>Fonts</span>
            <Badge variant="brand">Plus Jakarta Sans · IBM Plex Mono</Badge>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            Official Ganguram font files can be swapped in later — the font system is isolated in the design tokens.
          </div>
        </Card>
      </div>
    </div>
  );
}

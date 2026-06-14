import { type CSSProperties } from 'react';
import { Badge, Button, Card, Icon, IconButton, StatCard, Switch } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeTiffinTotal } from '../lib/payroll';
import { formatINR0, tiffinPerDay } from '../services';

const cell: CSSProperties = { padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 };
const th: CSSProperties = {
  textAlign: 'left',
  padding: '11px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-subtle)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--border-subtle)',
  whiteSpace: 'nowrap',
};

// Company-wide standard tiffin labels (per-employee setup can override).
const STANDARD_LABELS = [
  { id: 's1', label: 'Breakfast', amount: 60 },
  { id: 's2', label: 'Lunch / Dinner', amount: 100 },
];

export function TiffinPage() {
  const { employees } = useAppStore();
  const totalTiffin = employees.reduce((s, e) => s + employeeTiffinTotal(e), 0);
  const totalDays = employees.reduce((s, e) => s + e.tiffinDays, 0);
  const perDay = tiffinPerDay(STANDARD_LABELS);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Tiffin CTC — March" value={formatINR0(totalTiffin).replace('₹', '')} prefix="₹" icon="utensils" tone="blue" footnote="paid on top of salary" />
        <StatCard label="Tiffin days" value={totalDays} icon="calendar" tone="brand" footnote="across all employees" />
        <StatCard label="Standard rate / day" value={formatINR0(perDay).replace('₹', '')} prefix="₹" icon="rupee" tone="green" footnote="breakfast + lunch / dinner" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, alignItems: 'start' }}>
        <Card title="Tiffin labels" subtitle="Custom, company-paid CTC" action={<Button variant="tonal" size="sm" iconLeft={<Icon name="plus" size={15} />}>Add label</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STANDARD_LABELS.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--blue-50)', color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="utensils" size={17} />
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{t.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{formatINR0(t.amount)}</span>
                <IconButton icon="pencil" label="Edit" size="sm" />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Per full day</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)', fontWeight: 700 }}>{formatINR0(perDay)}</span>
            </div>
            <Switch checked label="Half-day tiffin eligible (default)" description="New employees inherit this; configurable per employee" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
              <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
              Tiffin is never a deduction. No tiffin is paid on paid-leave days.
            </div>
          </div>
        </Card>

        <Card title="Tiffin report" subtitle="Separately tracked & reportable" padding="0" action={<Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={15} />}>Export</Button>}>
          <div className="gx-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
              <thead>
                <tr style={{ background: 'var(--surface-inset)' }}>
                  {['Employee', 'Branch', 'Days', 'Per day', 'Tiffin CTC'].map((h, i) => (
                    <th key={i} style={{ ...th, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...cell, fontWeight: 600, color: 'var(--text-strong)' }}>{e.name}</td>
                    <td style={{ ...cell, color: 'var(--text-muted)' }}>{e.branch}</td>
                    <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{e.tiffinDays}</td>
                    <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{formatINR0(tiffinPerDay(e.tiffin))}</td>
                    <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-600)' }}>{formatINR0(employeeTiffinTotal(e))}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...cell, fontWeight: 700, color: 'var(--text-strong)' }} colSpan={4}>Total tiffin CTC</td>
                  <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blue-700)' }}>{formatINR0(totalTiffin)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <Badge variant="info" icon="utensils">Company-paid CTC — on top of salary</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

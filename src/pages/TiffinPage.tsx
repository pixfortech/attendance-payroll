import { Badge, Button, Card, Icon, IconButton, ResponsiveTable, StatCard, Switch, type Column } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeTiffinTotal } from '../lib/payroll';
import { formatINR0, tiffinPerDay } from '../services';
import type { Employee } from '../types';

const mono = { fontFamily: 'var(--font-mono)' as const };

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

  const columns: Column<Employee>[] = [
    { key: 'emp', header: 'Employee', render: (e) => <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{e.name}</span> },
    { key: 'branch', header: 'Branch', render: (e) => <span style={{ color: 'var(--text-muted)' }}>{e.branch}</span> },
    { key: 'days', header: 'Days', align: 'right', render: (e) => <span style={mono}>{e.tiffinDays}</span> },
    { key: 'perday', header: 'Per day', align: 'right', render: (e) => <span style={{ ...mono, color: 'var(--text-muted)' }}>{formatINR0(tiffinPerDay(e.tiffin))}</span> },
    { key: 'ctc', header: 'Tiffin CTC', align: 'right', render: (e) => <span style={{ ...mono, fontWeight: 700, color: 'var(--blue-600)' }}>{formatINR0(employeeTiffinTotal(e))}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="gx-grid gx-grid-stats3">
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
                <span style={{ fontSize: 15, fontWeight: 700, ...mono, color: 'var(--text-strong)' }}>{formatINR0(t.amount)}</span>
                <IconButton icon="pencil" label="Edit" size="sm" />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Per full day</span>
              <span style={{ ...mono, color: 'var(--text-strong)', fontWeight: 700 }}>{formatINR0(perDay)}</span>
            </div>
            <Switch checked label="Half-day tiffin eligible (default)" description="New employees inherit this; configurable per employee" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
              <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
              Tiffin is never a deduction. No tiffin is paid on paid-leave days.
            </div>
          </div>
        </Card>

        <Card title="Tiffin report" subtitle="Separately tracked & reportable" padding="0" action={<Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={15} />}>Export</Button>}>
          <ResponsiveTable columns={columns} rows={employees} rowKey={(e) => e.id} minWidth={560} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-inset)' }}>
            <Badge variant="info" icon="utensils">Company-paid CTC</Badge>
            <span style={{ fontSize: 14, ...mono, fontWeight: 800, color: 'var(--blue-700)' }}>Total {formatINR0(totalTiffin)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

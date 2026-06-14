import { Badge, Button, Card, Icon, IconButton, ProgressBar, StatCard } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { formatINR0 } from '../services';

const BASIS_LABEL = { fixed30: 'Fixed 30-day', calendar: 'Calendar-day' } as const;

export function BranchesPage() {
  const { branches, employees } = useAppStore();
  const totalStaff = branches.reduce((s, b) => s + b.staffCount, 0);
  const totalPayable = branches.reduce((s, b) => s + b.payable, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Export</Button>
        <Button variant="primary" iconLeft={<Icon name="plus" size={17} />}>Add branch</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Branches" value={branches.length} icon="building" tone="brand" footnote="all active" />
        <StatCard label="Total staff" value={totalStaff} icon="users" tone="blue" footnote={`${employees.length} in sample data`} />
        <StatCard label="Net payable — March" value={formatINR0(totalPayable).replace('₹', '')} prefix="₹" icon="wallet" tone="green" footnote="across all branches" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {branches.map((b) => {
          const pct = Math.round((b.presentToday / b.staffCount) * 100);
          return (
            <Card key={b.id} hover>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="building" size={22} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>{b.name}</h3>
                    <Badge variant="brand" size="sm">{b.code}</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="mapPin" size={13} /> {b.address}
                  </div>
                </div>
                <IconButton icon="pencil" label="Edit policy" size="sm" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginTop: 18 }}>
                <Field icon="user" label="Branch manager" value={b.manager} />
                <Field icon="phone" label="Contact" value={b.managerPhone} />
                <Field icon="users" label="Staff" value={`${b.staffCount} employees`} />
                <Field icon="calculator" label="Default basis" value={BASIS_LABEL[b.defaultBasis]} />
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)' }}>Present today · {b.presentToday}/{b.staffCount}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatINR0(b.payable)}</span>
                </div>
                <ProgressBar value={pct} max={100} tone={pct >= 92 ? 'green' : pct >= 89 ? 'brand' : 'amber'} height={6} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name={icon} size={13} color="var(--text-subtle)" />
        {label}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{value}</span>
    </div>
  );
}

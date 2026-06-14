import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, ResponsiveTable, StatCard, Tabs, type Column } from '../components/ui';
import { CONFIRMATION_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { formatINR } from '../services';
import type { ConfirmationStatus, Payment } from '../types';

type Row = Payment & { empId: string; empName: string; branch: string };
const mono = { fontFamily: 'var(--font-mono)' as const };

export function PaymentsPage() {
  const navigate = useNavigate();
  const { employees, updatePaymentStatus } = useAppStore();
  const [tab, setTab] = useState<'all' | ConfirmationStatus>('all');

  const ledger: Row[] = employees.flatMap((e) => e.payments.map((p) => ({ ...p, empId: e.id, empName: e.name, branch: e.branch })));
  const count = (s: ConfirmationStatus) => ledger.filter((p) => p.status === s).length;
  const rows = ledger.filter((p) => tab === 'all' || p.status === tab);

  const actionFor = (p: Row) => {
    if (p.status === 'disputed') return <Button variant="secondary" size="sm" onClick={() => updatePaymentStatus(p.empId, p.id, 'confirmed')}>Resolve</Button>;
    if (p.status === 'pending') return <Button variant="ghost" size="sm" iconLeft={<Icon name="bell" size={14} />}>Remind</Button>;
    return <Icon name="circleCheck" size={18} color="var(--green-500)" />;
  };

  const columns: Column<Row>[] = [
    {
      key: 'emp',
      header: 'Employee',
      render: (p) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => navigate(`/employees/${p.empId}`)}>
          <Avatar name={p.empName} size={32} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{p.empName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.branch}</div>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (p) => <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{p.type}</span> },
    { key: 'period', header: 'Period', render: (p) => <span style={{ color: 'var(--text-muted)' }}>{p.period}</span> },
    { key: 'date', header: 'Paid on', render: (p) => p.date },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span style={{ ...mono, fontWeight: 700 }}>{formatINR(p.amount)}</span> },
    { key: 'method', header: 'Method', render: (p) => <Badge variant="neutral" size="sm">{p.method}</Badge> },
    { key: 'ref', header: 'Reference', render: (p) => <span style={{ ...mono, color: 'var(--indigo-600)', fontSize: 12 }}>{p.ref}</span>, hideOnMobile: true },
    { key: 'conf', header: 'Confirmation', render: (p) => { const m = CONFIRMATION_META[p.status]; return <Badge variant={m.variant} dot>{m.label}</Badge>; } },
    { key: 'action', header: '', align: 'right', render: actionFor },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="gx-grid gx-grid-stats3">
        <StatCard label="Pending confirmation" value={count('pending')} icon="clock" tone="amber" footnote="awaiting employee" />
        <StatCard label="Confirmed by employee" value={count('confirmed')} icon="badgeCheck" tone="green" footnote="receipt acknowledged" />
        <StatCard label="Disputed / issue raised" value={count('disputed')} icon="alert" tone="coral" footnote="needs review" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as 'all' | ConfirmationStatus)}
          items={[
            { id: 'all', label: 'All', count: ledger.length },
            { id: 'pending', label: 'Pending', icon: 'clock', count: count('pending') },
            { id: 'confirmed', label: 'Confirmed', count: count('confirmed') },
            { id: 'disputed', label: 'Disputed', count: count('disputed') },
          ]}
        />
        <div style={{ flex: 1 }} />
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Export</Button>
      </div>

      <Card padding="0">
        <ResponsiveTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.empId + p.id}
          minWidth={980}
          emptyText="No payments match this filter."
          mobileCard={(p) => {
            const m = CONFIRMATION_META[p.status];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => navigate(`/employees/${p.empId}`)}>
                  <Avatar name={p.empName} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-strong)' }}>{p.empName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.type} · {p.period}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, ...mono, color: 'var(--text-strong)' }}>{formatINR(p.amount)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Badge variant={m.variant} dot>{m.label}</Badge>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.date} · {p.method}</span>
                </div>
                <div>{actionFor(p)}</div>
              </div>
            );
          }}
        />
      </Card>
    </div>
  );
}

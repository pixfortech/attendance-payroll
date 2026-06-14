import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, ResponsiveTable, StatCard, type Column } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeOutstandingAdvance } from '../lib/payroll';
import { formatINR0 } from '../services';
import type { Advance } from '../types';

type Row = Advance & { empId: string; empName: string; branch: string };
const mono = { fontFamily: 'var(--font-mono)' as const };

export function AdvancesPage() {
  const navigate = useNavigate();
  const { employees } = useAppStore();

  const ledger: Row[] = employees
    .flatMap((e) => e.advances.map((a) => ({ ...a, empId: e.id, empName: e.name, branch: e.branch })))
    .sort((a, b) => Number(a.cleared) - Number(b.cleared));

  const totalOutstanding = employees.reduce((s, e) => s + employeeOutstandingAdvance(e), 0);
  const totalAdvanced = ledger.reduce((s, a) => s + a.amount, 0);
  const withOutstanding = employees.filter((e) => employeeOutstandingAdvance(e) > 0).length;

  const columns: Column<Row>[] = [
    {
      key: 'emp',
      header: 'Employee',
      render: (a) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={a.empName} size={32} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{a.empName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.branch}</div>
          </div>
        </div>
      ),
    },
    { key: 'date', header: 'Date', render: (a) => a.date },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => <span style={{ ...mono, fontWeight: 700 }}>{formatINR0(a.amount)}</span> },
    { key: 'method', header: 'Method', render: (a) => <Badge variant="neutral" size="sm">{a.method}</Badge> },
    { key: 'ref', header: 'Reference', render: (a) => <span style={{ ...mono, color: 'var(--indigo-600)', fontSize: 12 }}>{a.ref}</span> },
    { key: 'note', header: 'Note', render: (a) => <span style={{ color: 'var(--text-muted)' }}>{a.note}</span>, hideOnMobile: true },
    { key: 'status', header: 'Status', render: (a) => (a.cleared ? <Badge variant="confirmed" size="sm" dot>Cleared</Badge> : <Badge variant="pending" size="sm" dot>Outstanding</Badge>) },
    { key: 'action', header: '', align: 'right', render: () => <Icon name="chevronRight" size={16} color="var(--text-subtle)" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="gx-grid gx-grid-stats3">
        <StatCard label="Outstanding advances" value={formatINR0(totalOutstanding).replace('₹', '')} prefix="₹" icon="banknote" tone="coral" footnote="recoverable against salary" />
        <StatCard label="Total advanced" value={formatINR0(totalAdvanced).replace('₹', '')} prefix="₹" icon="wallet" tone="brand" footnote="all recorded entries" />
        <StatCard label="With advances" value={withOutstanding} icon="users" tone="amber" footnote="currently outstanding" />
      </div>

      <Card
        title="Advance ledger"
        subtitle="Employee-wise advances — record new advances from a profile"
        padding="0"
        action={
          <Button variant="secondary" size="sm" iconLeft={<Icon name="users" size={15} />} onClick={() => navigate('/employees')}>
            Employees
          </Button>
        }
      >
        <ResponsiveTable
          columns={columns}
          rows={ledger}
          rowKey={(a) => a.id}
          onRowClick={(a) => navigate(`/employees/${a.empId}`)}
          minWidth={820}
          emptyText="No advances recorded."
        />
      </Card>
    </div>
  );
}

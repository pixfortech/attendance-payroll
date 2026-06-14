import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, IconButton, StatCard } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeOutstandingAdvance } from '../lib/payroll';
import { formatINR0 } from '../services';

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

export function AdvancesPage() {
  const navigate = useNavigate();
  const { employees } = useAppStore();

  const ledger = employees
    .flatMap((e) => e.advances.map((a) => ({ ...a, empId: e.id, empName: e.name, branch: e.branch })))
    .sort((a, b) => Number(a.cleared) - Number(b.cleared));

  const totalOutstanding = employees.reduce((s, e) => s + employeeOutstandingAdvance(e), 0);
  const totalAdvanced = ledger.reduce((s, a) => s + a.amount, 0);
  const withOutstanding = employees.filter((e) => employeeOutstandingAdvance(e) > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Outstanding advances" value={formatINR0(totalOutstanding).replace('₹', '')} prefix="₹" icon="banknote" tone="coral" footnote="recoverable against salary" />
        <StatCard label="Total advanced" value={formatINR0(totalAdvanced).replace('₹', '')} prefix="₹" icon="wallet" tone="brand" footnote="all recorded entries" />
        <StatCard label="Employees with advances" value={withOutstanding} icon="users" tone="amber" footnote="currently outstanding" />
      </div>

      <Card
        title="Advance ledger"
        subtitle="Employee-wise advances — record new advances from an employee's profile"
        padding="0"
        action={
          <Button variant="secondary" size="sm" iconLeft={<Icon name="users" size={15} />} onClick={() => navigate('/employees')}>
            Go to employees
          </Button>
        }
      >
        <div className="gx-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 820 }}>
            <thead>
              <tr style={{ background: 'var(--surface-inset)' }}>
                {['Employee', 'Date', 'Amount', 'Method', 'Reference', 'Note', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ ...th, textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...cell, textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>No advances recorded.</td>
                </tr>
              )}
              {ledger.map((a) => (
                <tr
                  key={a.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/employees/${a.empId}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={cell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={a.empName} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{a.empName}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.branch}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>{a.date}</td>
                  <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR0(a.amount)}</td>
                  <td style={cell}><Badge variant="neutral" size="sm">{a.method}</Badge></td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', color: 'var(--indigo-600)', fontSize: 12 }}>{a.ref}</td>
                  <td style={{ ...cell, color: 'var(--text-muted)' }}>{a.note}</td>
                  <td style={cell}>{a.cleared ? <Badge variant="confirmed" size="sm" dot>Cleared</Badge> : <Badge variant="pending" size="sm" dot>Outstanding</Badge>}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    <IconButton icon="chevronRight" label="Open employee" size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

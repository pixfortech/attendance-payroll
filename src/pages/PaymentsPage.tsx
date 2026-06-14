import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, StatCard, Tabs } from '../components/ui';
import { CONFIRMATION_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { formatINR } from '../services';
import type { ConfirmationStatus } from '../types';

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

export function PaymentsPage() {
  const navigate = useNavigate();
  const { employees, updatePaymentStatus } = useAppStore();
  const [tab, setTab] = useState<'all' | ConfirmationStatus>('all');

  const ledger = employees.flatMap((e) => e.payments.map((p) => ({ ...p, empId: e.id, empName: e.name, branch: e.branch })));
  const count = (s: ConfirmationStatus) => ledger.filter((p) => p.status === s).length;
  const rows = ledger.filter((p) => tab === 'all' || p.status === tab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
        <div className="gx-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 980 }}>
            <thead>
              <tr style={{ background: 'var(--surface-inset)' }}>
                {['Employee', 'Type', 'Period', 'Paid on', 'Amount', 'Method', 'Reference', 'Confirmation', ''].map((h, i) => (
                  <th key={i} style={{ ...th, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const meta = CONFIRMATION_META[p.status];
                return (
                  <tr key={p.empId + p.id}>
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate(`/employees/${p.empId}`)}>
                        <Avatar name={p.empName} size={32} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{p.empName}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.branch}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...cell, fontWeight: 600, color: 'var(--text-strong)' }}>{p.type}</td>
                    <td style={{ ...cell, color: 'var(--text-muted)' }}>{p.period}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{p.date}</td>
                    <td style={{ ...cell, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR(p.amount)}</td>
                    <td style={cell}><Badge variant="neutral" size="sm">{p.method}</Badge></td>
                    <td style={{ ...cell, fontFamily: 'var(--font-mono)', color: 'var(--indigo-600)', fontSize: 12 }}>{p.ref}</td>
                    <td style={cell}><Badge variant={meta.variant} dot>{meta.label}</Badge></td>
                    <td style={{ ...cell, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {p.status === 'disputed' && (
                        <Button variant="secondary" size="sm" onClick={() => updatePaymentStatus(p.empId, p.id, 'confirmed')}>Resolve</Button>
                      )}
                      {p.status === 'pending' && (
                        <Button variant="ghost" size="sm" iconLeft={<Icon name="bell" size={14} />}>Remind</Button>
                      )}
                      {p.status === 'confirmed' && <Icon name="circleCheck" size={18} color="var(--green-500)" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

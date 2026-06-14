import { useState, type CSSProperties, type ReactNode } from 'react';
import { Avatar, Badge, Button, Card, Icon, IconButton, Select, Tabs } from '../components/ui';
import { SalarySlip } from '../components/payroll/SalarySlip';
import { PAYROLL_STATUS_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { employeeBreakdown } from '../lib/payroll';
import { formatINR } from '../services';
import { BRANCH_NAMES } from '../data';
import type { Employee, PayrollStatus } from '../types';

const cellBase: CSSProperties = { padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 };

function Num({ children, red }: { children: ReactNode; red?: boolean }) {
  return (
    <td style={{ ...cellBase, textAlign: 'right', fontWeight: red ? 700 : 500, color: red ? 'var(--coral-600)' : 'var(--text-body)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{children}</td>
  );
}

export function SalaryPage() {
  const { employees } = useAppStore();
  const [tab, setTab] = useState<'all' | PayrollStatus>('all');
  const [branch, setBranch] = useState('');
  const [slip, setSlip] = useState<Employee | null>(null);

  const count = (s: PayrollStatus) => employees.filter((e) => e.payrollStatus === s).length;
  const rows = employees.filter((e) => (tab === 'all' || e.payrollStatus === tab) && (!branch || e.branch === branch));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as 'all' | PayrollStatus)}
          items={[
            { id: 'all', label: 'All', count: employees.length },
            { id: 'pending', label: 'Pending', icon: 'clock', count: count('pending') },
            { id: 'approved', label: 'Approved', count: count('approved') },
            { id: 'paid', label: 'Paid', count: count('paid') },
          ]}
        />
        <div style={{ flex: 1 }} />
        <div style={{ width: 180 }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="All branches" options={['', ...BRANCH_NAMES]} />
        </div>
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Excel</Button>
        <Button variant="accent" iconLeft={<Icon name="badgeCheck" size={17} />}>Approve all pending</Button>
      </div>

      <Card padding="0">
        <div className="gx-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 980 }}>
            <thead>
              <tr style={{ background: 'var(--surface-inset)' }}>
                {['Employee', 'Gross', 'Worked', 'Leave (used/free)', 'Deduction', 'Tiffin CTC', 'Net payable', 'Status', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: i >= 1 && i <= 6 ? 'right' : 'left',
                      padding: '13px 18px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text-subtle)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--border-subtle)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const b = employeeBreakdown(r);
                const status = PAYROLL_STATUS_META[r.payrollStatus];
                return (
                  <tr
                    key={r.id}
                    style={{ transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-50)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={cellBase}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar name={r.name} size={36} />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>{r.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{r.id} · {r.branch}</div>
                        </div>
                      </div>
                    </td>
                    <Num>{formatINR(r.salary)}</Num>
                    <td style={{ ...cellBase, textAlign: 'right', color: 'var(--text-body)', fontFamily: 'var(--font-mono)' }}>{r.worked} d</td>
                    <td style={{ ...cellBase, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: r.leaveUsed > b.freeLeaveAllowed ? 'var(--coral-600)' : 'var(--text-body)' }}>{r.leaveUsed}</span>
                      <span style={{ color: 'var(--text-subtle)' }}> / {b.freeLeaveAllowed}</span>
                    </td>
                    <Num red={b.leaveDeduction > 0}>{b.leaveDeduction > 0 ? '−' + formatINR(b.leaveDeduction) : '—'}</Num>
                    <td style={{ ...cellBase, textAlign: 'right', color: 'var(--blue-600)', fontFamily: 'var(--font-mono)' }}>+{formatINR(b.tiffinTotal)}</td>
                    <td style={{ ...cellBase, textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatINR(b.finalPayable)}</td>
                    <td style={cellBase}><Badge variant={status.variant} dot>{status.label}</Badge></td>
                    <td style={{ ...cellBase, padding: '12px 14px', textAlign: 'right' }}>
                      <IconButton icon="eye" label="View slip" size="sm" onClick={() => setSlip(r)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {slip && <SalarySlip employee={slip} onClose={() => setSlip(null)} />}
    </div>
  );
}

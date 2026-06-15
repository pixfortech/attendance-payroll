import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, ProgressBar, ResponsiveTable, StatCard, type Column } from '../components/ui';
import { SALARY_STATUS_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { employeeBreakdown, isActiveEmployee, salaryStatus } from '../lib/payroll';
import { formatINR0, formatNumberIN, round2 } from '../services';
import { CURRENT_MONTH } from '../data';
import type { Branch } from '../types';

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: '8px 2px' }}><Icon name="info" size={15} color="var(--indigo-400)" /> {children}</div>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { employees, branches, checkins } = useAppStore();

  const active = employees.filter(isActiveEmployee);
  const activeBranches = branches.filter((b) => !b.archived && b.status === 'active');
  const presentToday = new Set(checkins.map((c) => c.employeeId)).size;
  const netPayable = round2(active.reduce((s, e) => s + employeeBreakdown(e).netSalary, 0));
  const tiffinCTC = round2(active.reduce((s, e) => s + employeeBreakdown(e).tiffinTotal, 0));
  const pending = active.filter((e) => ['pending', 'requested'].includes(salaryStatus(e)));
  const approvedCount = active.filter((e) => e.payrollStatus === 'approved').length;
  const paidCount = active.filter((e) => e.payrollStatus === 'paid').length;
  const decided = approvedCount + paidCount;
  const noEmployees = active.length === 0;

  const branchColumns: Column<Branch>[] = [
    {
      key: 'name',
      header: 'Branch',
      render: (b) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="mapPin" size={15} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{b.name}</span>
        </div>
      ),
    },
    {
      key: 'staff',
      header: 'Staff',
      align: 'right',
      render: (b) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{active.filter((e) => e.branchCode === b.code || e.branch === b.name).length}</span>,
    },
    {
      key: 'pay',
      header: 'Net payable',
      align: 'right',
      render: (b) => {
        const payable = active.filter((e) => e.branchCode === b.code || e.branch === b.name).reduce((s, e) => s + employeeBreakdown(e).netSalary, 0);
        return <span style={{ fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatINR0(payable)}</span>;
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {noEmployees && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="users" size={22} /></span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>No employees yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Import employees to begin payroll, attendance and tiffin tracking.</div>
            </div>
            <Button variant="primary" iconLeft={<Icon name="upload" size={16} />} onClick={() => navigate('/employees')}>Import employees</Button>
          </div>
        </Card>
      )}

      <div className="gx-grid gx-grid-stats">
        <StatCard label={`Net payable — ${CURRENT_MONTH.label.split(' ')[0]}`} value={formatNumberIN(netPayable)} prefix="₹" icon="wallet" tone="brand" footnote="take-home salaries (excl. tiffin)" onClick={() => navigate('/salary')} />
        <StatCard label="Present today" value={presentToday} suffix={`/ ${active.length}`} icon="users" tone="green" footnote={presentToday === 0 ? 'No attendance recorded yet' : 'checked in today'} onClick={() => navigate('/attendance')} />
        <StatCard label="Pending approvals" value={pending.length} icon="clock" tone="amber" footnote={pending.length === 0 ? 'No salary approvals pending' : 'awaiting review'} onClick={() => navigate('/salary')} />
        <StatCard label={`Tiffin (CTC) — ${CURRENT_MONTH.label.split(' ')[0]}`} value={formatNumberIN(tiffinCTC)} prefix="₹" icon="utensils" tone="blue" footnote={tiffinCTC === 0 ? 'No tiffin records yet' : 'paid on top of salary'} onClick={() => navigate('/tiffin')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Card title="Branch summary" subtitle="Active branches & staff" action={<Button variant="ghost" size="sm" iconRight={<Icon name="chevronRight" size={15} />} onClick={() => navigate('/branches')}>All branches</Button>} bodyStyle={{ padding: 0 }}>
          {activeBranches.length === 0 ? (
            <div style={{ padding: 20 }}><EmptyHint>No active branches. Import branches to start.</EmptyHint></div>
          ) : (
            <ResponsiveTable columns={branchColumns} rows={activeBranches} rowKey={(b) => b.id} onRowClick={() => navigate('/branches')} minWidth={420} />
          )}
        </Card>

        <Card title={`${CURRENT_MONTH.label} payroll run`} subtitle="Approval progress" action={<Icon name="refresh" size={16} color="var(--text-muted)" />}>
          {active.length === 0 ? (
            <EmptyHint>No payroll run started.</EmptyHint>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{decided}</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>/ {active.length} processed</span>
              </div>
              <ProgressBar value={decided} max={active.length} tone="brand" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Row label="Approved" value={approvedCount} tone="paid" />
                <Row label="Paid" value={paidCount} tone="paid" />
                <Row label="Pending / requested" value={pending.length} tone="pending" />
                <Row label="Not started" value={active.length - decided - pending.length} tone="neutral" />
              </div>
              {decided === 0 && pending.length === 0 && <EmptyHint>No payroll run started — add attendance or accept salary requests.</EmptyHint>}
              <Button variant="primary" full iconLeft={<Icon name="badgeCheck" size={17} />} onClick={() => navigate('/salary')}>Review &amp; approve</Button>
            </div>
          )}
        </Card>
      </div>

      <Card title="Awaiting approval" subtitle="Pending & requested salaries" action={<Badge variant="pending">{pending.length}</Badge>}>
        {pending.length === 0 ? (
          <EmptyHint>No salary approvals pending.</EmptyHint>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pending.slice(0, 8).map((a) => {
              const meta = SALARY_STATUS_META[salaryStatus(a)];
              return (
                <div key={a.id} onClick={() => navigate(`/employees/${a.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 6px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <Avatar name={a.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.branch}</div>
                  </div>
                  <Badge variant={meta.variant} size="sm" dot>{meta.label}</Badge>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatINR0(employeeBreakdown(a).netSalary)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: 'paid' | 'pending' | 'rejected' | 'neutral' }) {
  const dot = { paid: 'var(--green-500)', pending: 'var(--amber-500)', rejected: 'var(--coral-500)', neutral: 'var(--neutral-300)' }[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-body)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

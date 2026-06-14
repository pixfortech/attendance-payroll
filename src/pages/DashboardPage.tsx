import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, ProgressBar, ResponsiveTable, StatCard, type Column } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { employeeBreakdown } from '../lib/payroll';
import { formatINR0 } from '../services';
import type { Branch } from '../types';

const TREND = [
  { m: 'Oct', v: 13.2 },
  { m: 'Nov', v: 13.9 },
  { m: 'Dec', v: 15.1 },
  { m: 'Jan', v: 14.2 },
  { m: 'Feb', v: 13.9 },
  { m: 'Mar', v: 14.8 },
];

function MiniBar() {
  const max = Math.max(...TREND.map((t) => t.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 130, padding: '8px 4px 0' }}>
      {TREND.map((t, i) => {
        const on = i === TREND.length - 1;
        return (
          <div key={t.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--indigo-700)' : 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>{t.v}L</span>
            <div
              style={{
                width: '100%',
                maxWidth: 46,
                height: (t.v / max) * 96,
                borderRadius: '8px 8px 4px 4px',
                background: on ? 'var(--brand-primary)' : 'var(--indigo-100)',
                boxShadow: on ? 'var(--shadow-brand)' : 'none',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t.m}</span>
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'paid' | 'pending' | 'rejected' | 'neutral' }) {
  const dot = { paid: 'var(--green-500)', pending: 'var(--amber-500)', rejected: 'var(--coral-500)', neutral: 'var(--neutral-300)' }[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-body)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { employees, branches } = useAppStore();
  const approvals = employees.filter((e) => e.payrollStatus === 'pending' || e.payrollStatus === 'hold');

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
    { key: 'staff', header: 'Staff', render: (b) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{b.presentToday}/{b.staffCount}</span> },
    {
      key: 'att',
      header: 'Attendance',
      render: (b) => {
        const pct = Math.round((b.presentToday / b.staffCount) * 100);
        return <div style={{ minWidth: 90 }}><ProgressBar value={pct} max={100} tone={pct >= 92 ? 'green' : pct >= 89 ? 'brand' : 'amber'} height={6} /></div>;
      },
    },
    { key: 'pay', header: 'Payable', align: 'right', render: (b) => <span style={{ fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatINR0(b.payable)}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="gx-grid gx-grid-stats">
        <StatCard label="Net payable — March" value="14,82,500" prefix="₹" icon="wallet" tone="brand" delta="+6.4%" footnote="vs February" onClick={() => navigate('/salary')} />
        <StatCard label="Present today" value="148" suffix="/ 162" icon="users" tone="green" footnote="91% attendance" onClick={() => navigate('/attendance')} />
        <StatCard label="Pending approvals" value="12" icon="clock" tone="amber" footnote="across 5 branches" onClick={() => navigate('/salary')} />
        <StatCard label="Tiffin (CTC) — March" value="1,06,240" prefix="₹" icon="utensils" tone="blue" delta="+2.1%" footnote="paid on top of salary" onClick={() => navigate('/tiffin')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Card title="Payroll trend" subtitle="Total monthly payout (₹ lakh)" action={<Badge variant="brand" icon="trendUp">6-month</Badge>}>
          <MiniBar />
        </Card>
        <Card title="March payroll run" subtitle="Approval progress" action={<Icon name="refresh" size={16} color="var(--text-muted)" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>138</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>/ 162 approved</span>
            </div>
            <ProgressBar value={138} max={162} tone="brand" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Approved" value="138" tone="paid" />
              <Row label="Pending review" value="12" tone="pending" />
              <Row label="On hold / query" value="6" tone="rejected" />
              <Row label="Not started" value="6" tone="neutral" />
            </div>
            <Button variant="primary" full iconLeft={<Icon name="badgeCheck" size={17} />} onClick={() => navigate('/salary')}>
              Review &amp; approve
            </Button>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <Card
          title="Branch summary"
          subtitle="Attendance &amp; payable this month"
          action={
            <Button variant="ghost" size="sm" iconRight={<Icon name="chevronRight" size={15} />} onClick={() => navigate('/branches')}>
              All branches
            </Button>
          }
        >
          <ResponsiveTable columns={branchColumns} rows={branches} rowKey={(b) => b.id} onRowClick={() => navigate('/branches')} minWidth={520} />
        </Card>

        <Card title="Awaiting approval" subtitle="Top of the queue" action={<Badge variant="pending">{approvals.length}</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {approvals.map((a) => {
              const net = employeeBreakdown(a).finalPayable;
              return (
                <div
                  key={a.id}
                  onClick={() => navigate(`/employees/${a.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 6px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                >
                  <Avatar name={a.name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.branch}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{formatINR0(net)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Avatar, Badge, Button, Card, Icon, IconButton, ResponsiveTable, Select, Tabs, useConfirm, useToast, type Column } from '../components/ui';
import { SalarySlip } from '../components/payroll/SalarySlip';
import { RecordPaymentModal } from '../components/payroll/RecordPaymentModal';
import { AdvanceAdjustModal } from '../components/payroll/AdvanceAdjustModal';
import { SALARY_STATUS_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { employeeAdvanceAdjustment, employeeAdvanceRemaining, employeeBreakdown, salaryStatus, canApproveSalary, isActiveEmployee } from '../lib/payroll';
import { branchFilterOptions, employeeInBranch } from '../lib/branches';
import { downloadCsv } from '../lib/download';
import { downloadPayslip } from '../lib/payslip';
import { formatINR } from '../services';
import { CURRENT_MONTH } from '../data';
import type { Employee, SalaryStatus } from '../types';

const mono = { fontFamily: 'var(--font-mono)' as const };

export function SalaryPage() {
  const { employees, branches, setPayrollStatus, addPayment, approveAllPending, salaryEntries, logAudit } = useAppStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const [branch, setBranch] = useState('');
  const [slip, setSlip] = useState<Employee | null>(null);
  const [payFor, setPayFor] = useState<Employee | null>(null);
  const [adjustFor, setAdjustFor] = useState<Employee | null>(null);

  const onDownload = (r: Employee) => {
    downloadPayslip(r);
    logAudit({ entity: 'Salary', target: `${r.name} (${r.id})`, field: 'Payslip downloaded', oldValue: '—', newValue: CURRENT_MONTH.label });
    toast(`Payslip downloaded for ${r.name}`);
  };

  const active = employees.filter(isActiveEmployee);
  // Prefer a frozen Firestore salary entry (written on approval/payment) over a
  // live recalculation; fall back to the live breakdown when none exists.
  const entryFor = (id: string) => salaryEntries.find((s) => s.employeeId === id && s.month === CURRENT_MONTH.month && s.year === CURRENT_MONTH.year);
  const figures = (r: Employee) => {
    const se = entryFor(r.id);
    const b = employeeBreakdown(r);
    return {
      gross: se?.grossPayable ?? r.salary,
      worked: se?.workedDays ?? r.worked,
      leaveUsed: se?.leaveUsed ?? r.leaveUsed,
      freeLeaveAllowed: b.freeLeaveAllowed,
      deductionTotal: se?.deductionTotal ?? b.deductionTotal,
      tiffinTotal: se?.tiffinCtc ?? b.tiffinTotal,
      netSalary: se?.netPayable ?? b.netSalary,
      advanceAdjusted: se?.advanceAdjustment ?? employeeAdvanceAdjustment(r),
      advanceRemaining: employeeAdvanceRemaining(r),
    };
  };
  const inTab = (e: Employee) => {
    const s = salaryStatus(e);
    if (tab === 'all') return true;
    if (tab === 'pending') return s === 'pending' || s === 'requested' || s === 'notstarted';
    return s === tab;
  };
  const rows = active.filter((e) => inTab(e) && employeeInBranch(e, branch, branches));
  const count = (fn: (s: SalaryStatus) => boolean) => active.filter((e) => fn(salaryStatus(e))).length;

  const approveAll = async () => {
    const n = active.filter((e) => canApproveSalary(e) && salaryStatus(e) === 'pending').length;
    if (!n) return toast('No pending salaries to approve', 'info');
    const ok = await confirm({ title: 'Approve all pending salaries?', message: `${n} salary${n > 1 ? 'ies' : ''} with worked days will be approved for ${CURRENT_MONTH.label}.`, confirmLabel: 'Approve all', tone: 'primary', icon: 'badgeCheck' });
    if (ok) approveAllPending();
  };

  const exportCsv = () =>
    downloadCsv(`salary-${CURRENT_MONTH.short}.csv`, [
      ['Employee', 'ID', 'Branch', 'Gross payable', 'Worked', 'Leave used', 'Free leave', 'Deduction', 'Tiffin CTC', 'Advance adjusted', 'Advance remaining', 'Net payable', 'Status'],
      ...rows.map((r) => {
        const f = figures(r);
        return [r.name, r.id, r.branch, r.salaryMissing ? 'missing' : f.gross, f.worked, f.leaveUsed, f.freeLeaveAllowed, f.deductionTotal, f.tiffinTotal, f.advanceAdjusted, f.advanceRemaining, f.netSalary, SALARY_STATUS_META[salaryStatus(r)].label];
      }),
    ]);

  const Actions = ({ r, full }: { r: Employee; full?: boolean }) => {
    const s = salaryStatus(r);
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...(full ? { display: 'flex' } : {}) }}>
        {s === 'approved' && <Button variant="accent" size="sm" full={full} iconLeft={<Icon name="wallet" size={14} />} onClick={() => setPayFor(r)}>Mark paid</Button>}
        {(s === 'pending' || s === 'requested' || s === 'notstarted' || s === 'hold') && (
          <Button variant="secondary" size="sm" full={full} disabled={!canApproveSalary(r)} title={!canApproveSalary(r) ? 'Needs at least 1 worked day or a salary request' : undefined} iconLeft={<Icon name="badgeCheck" size={14} />} onClick={() => setPayrollStatus(r.id, 'approved')}>Approve</Button>
        )}
        {(s === 'pending' || s === 'requested' || s === 'approved') && <Button variant="ghost" size="sm" full={full} onClick={() => setPayrollStatus(r.id, 'hold')}>Hold</Button>}
        {!full && <IconButton icon="banknote" label="Adjust advance" size="sm" onClick={() => setAdjustFor(r)} />}
        {!full && <IconButton icon="download" label="Download payslip" size="sm" onClick={() => onDownload(r)} />}
        {!full && <IconButton icon="eye" label="View slip" size="sm" onClick={() => setSlip(r)} />}
      </div>
    );
  };

  const columns: Column<Employee>[] = [
    {
      key: 'emp',
      header: 'Employee',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Avatar name={r.name} size={36} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{r.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', ...mono }}>{r.id} · {r.branch}</div>
          </div>
        </div>
      ),
    },
    { key: 'gross', header: 'Gross payable', align: 'right', render: (r) => (r.salaryMissing ? <Badge variant="pending" size="sm" dot>Salary missing</Badge> : <span style={mono}>{formatINR(figures(r).gross)}</span>) },
    { key: 'worked', header: 'Worked', align: 'right', render: (r) => <span style={{ ...mono, color: 'var(--text-body)' }}>{figures(r).worked} d</span> },
    {
      key: 'leave',
      header: 'Leave (used/free)',
      align: 'right',
      render: (r) => {
        const f = figures(r);
        return (<span style={mono}><span style={{ color: f.leaveUsed > f.freeLeaveAllowed ? 'var(--coral-600)' : 'var(--text-body)' }}>{f.leaveUsed}</span><span style={{ color: 'var(--text-subtle)' }}> / {f.freeLeaveAllowed}</span></span>);
      },
    },
    { key: 'ded', header: 'Deduction', align: 'right', render: (r) => { const d = figures(r).deductionTotal; return <span style={{ ...mono, fontWeight: d > 0 ? 700 : 400, color: d > 0 ? 'var(--coral-600)' : 'var(--text-body)' }}>{d > 0 ? '−' + formatINR(d) : '—'}</span>; } },
    { key: 'tiffin', header: 'Tiffin CTC', align: 'right', render: (r) => { const t = figures(r).tiffinTotal; return <span style={{ ...mono, color: t > 0 ? 'var(--blue-600)' : 'var(--text-subtle)' }}>{t > 0 ? '+' + formatINR(t) : '—'}</span>; } },
    { key: 'advAdj', header: 'Advance adj.', align: 'right', render: (r) => { const a = figures(r).advanceAdjusted; return <span style={{ ...mono, color: a > 0 ? 'var(--coral-600)' : 'var(--text-subtle)' }}>{a > 0 ? '−' + formatINR(a) : '—'}</span>; } },
    { key: 'advRem', header: 'Advance rem.', align: 'right', render: (r) => { const a = figures(r).advanceRemaining; return <span style={{ ...mono, color: a > 0 ? 'var(--text-body)' : 'var(--text-subtle)' }}>{a > 0 ? formatINR(a) : '—'}</span>; } },
    { key: 'net', header: 'Net payable', align: 'right', render: (r) => (r.salaryMissing ? <span style={{ color: 'var(--text-subtle)' }}>—</span> : <span style={{ ...mono, fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR(figures(r).netSalary)}</span>) },
    { key: 'status', header: 'Status', render: (r) => { const s = SALARY_STATUS_META[salaryStatus(r)]; return <Badge variant={s.variant} dot>{s.label}</Badge>; } },
    { key: 'actions', header: 'Actions', align: 'right', render: (r) => <Actions r={r} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          items={[
            { id: 'all', label: 'All', count: active.length },
            { id: 'pending', label: 'Pending', icon: 'clock', count: count((s) => s === 'pending' || s === 'requested' || s === 'notstarted') },
            { id: 'approved', label: 'Approved', count: count((s) => s === 'approved') },
            { id: 'paid', label: 'Paid', count: count((s) => s === 'paid') },
          ]}
        />
        <div style={{ flex: 1 }} />
        <div style={{ minWidth: 160, flex: '1 1 160px' }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={branchFilterOptions(branches)} />
        </div>
        <Button variant="ghost" iconLeft={<Icon name="refresh" size={16} />} onClick={() => toast(`Salary recalculated for ${CURRENT_MONTH.label}`)}>Recalculate</Button>
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />} onClick={exportCsv}>Excel</Button>
        <Button variant="accent" iconLeft={<Icon name="badgeCheck" size={17} />} onClick={approveAll}>Approve all pending</Button>
      </div>

      <Card padding="0">
        <ResponsiveTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          minWidth={1240}
          emptyText={active.length === 0 ? 'No employees yet — import employees to begin payroll.' : 'No salaries match this filter.'}
          mobileCard={(r) => {
            const b = figures(r);
            const s = SALARY_STATUS_META[salaryStatus(r)];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar name={r.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', ...mono }}>{r.id} · {r.branch}</div>
                  </div>
                  <Badge variant={s.variant} dot>{s.label}</Badge>
                </div>
                {r.salaryMissing ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: 'var(--amber-700)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                    <Icon name="alert" size={14} /> Salary missing — update before payroll
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 12px', background: 'var(--indigo-50)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net payable</span>
                    <span style={{ fontSize: 18, fontWeight: 800, ...mono, color: 'var(--indigo-700)' }}>{formatINR(b.netSalary)}</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                  <Kv label="Gross" value={r.salaryMissing ? '—' : formatINR(b.gross)} />
                  <Kv label="Worked" value={`${b.worked} d`} />
                  <Kv label="Deduction" value={b.deductionTotal > 0 ? '−' + formatINR(b.deductionTotal) : '—'} color={b.deductionTotal > 0 ? 'var(--coral-600)' : undefined} />
                  <Kv label="Tiffin CTC" value={b.tiffinTotal > 0 ? '+' + formatINR(b.tiffinTotal) : '—'} color={b.tiffinTotal > 0 ? 'var(--blue-600)' : undefined} />
                  <Kv label="Advance adj." value={b.advanceAdjusted > 0 ? '−' + formatINR(b.advanceAdjusted) : '—'} color={b.advanceAdjusted > 0 ? 'var(--coral-600)' : undefined} />
                  <Kv label="Advance rem." value={b.advanceRemaining > 0 ? formatINR(b.advanceRemaining) : '—'} />
                </div>
                <Actions r={r} full />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" full size="sm" iconLeft={<Icon name="eye" size={15} />} onClick={() => setSlip(r)}>Payslip</Button>
                  <Button variant="secondary" full size="sm" iconLeft={<Icon name="download" size={15} />} onClick={() => onDownload(r)}>Download</Button>
                  <Button variant="tonal" full size="sm" iconLeft={<Icon name="banknote" size={15} />} onClick={() => setAdjustFor(r)}>Advance</Button>
                </div>
              </div>
            );
          }}
        />
      </Card>

      {slip && <SalarySlip employee={slip} onClose={() => setSlip(null)} />}
      {payFor && (
        <RecordPaymentModal
          defaultType="Salary"
          defaultAmount={String(employeeBreakdown(payFor).netSalary)}
          onClose={() => setPayFor(null)}
          onSave={(p) => {
            addPayment(payFor.id, p);
            setPayrollStatus(payFor.id, 'paid');
            setPayFor(null);
          }}
        />
      )}
      {adjustFor && <AdvanceAdjustModal employee={adjustFor} onClose={() => setAdjustFor(null)} />}
    </div>
  );
}

function Kv({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: color ?? 'var(--text-strong)' }}>{value}</span>
    </div>
  );
}

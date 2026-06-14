import { useState } from 'react';
import { Avatar, Badge, Button, Card, Icon, IconButton, ResponsiveTable, Select, Tabs, useConfirm, useToast, type Column } from '../components/ui';
import { SalarySlip } from '../components/payroll/SalarySlip';
import { RecordPaymentModal } from '../components/payroll/RecordPaymentModal';
import { PAYROLL_STATUS_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { employeeBreakdown } from '../lib/payroll';
import { downloadCsv } from '../lib/download';
import { formatINR } from '../services';
import { BRANCH_NAMES, CURRENT_MONTH } from '../data';
import type { Employee, PayrollStatus } from '../types';

const mono = { fontFamily: 'var(--font-mono)' as const };

export function SalaryPage() {
  const { employees, approveAllPending, setPayrollStatus, addPayment } = useAppStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<'all' | PayrollStatus>('all');
  const [branch, setBranch] = useState('');
  const [slip, setSlip] = useState<Employee | null>(null);
  const [payFor, setPayFor] = useState<Employee | null>(null);

  const count = (s: PayrollStatus) => employees.filter((e) => e.payrollStatus === s).length;
  const rows = employees.filter((e) => (tab === 'all' || e.payrollStatus === tab) && (!branch || e.branch === branch));

  const approveAll = async () => {
    const pending = count('pending');
    if (!pending) return toast('No pending salaries', 'info');
    const ok = await confirm({ title: 'Approve all pending salaries?', message: `${pending} pending salary${pending > 1 ? 'ies' : ''} will be approved for ${CURRENT_MONTH.label}.`, confirmLabel: 'Approve all', tone: 'primary', icon: 'badgeCheck' });
    if (ok) approveAllPending();
  };

  const exportCsv = () =>
    downloadCsv(`salary-${CURRENT_MONTH.short}.csv`, [
      ['Employee', 'ID', 'Branch', 'Gross', 'Worked', 'Leave used', 'Free leave', 'Deduction', 'Tiffin CTC', 'Net payable', 'Status'],
      ...rows.map((r) => {
        const b = employeeBreakdown(r);
        return [r.name, r.id, r.branch, r.salary, r.worked, r.leaveUsed, b.freeLeaveAllowed, b.leaveDeduction, b.tiffinTotal, b.finalPayable, r.payrollStatus];
      }),
    ]);

  const StatusAction = ({ r, full }: { r: Employee; full?: boolean }) => {
    if (r.payrollStatus === 'pending' || r.payrollStatus === 'hold')
      return <Button variant="secondary" size="sm" full={full} iconLeft={<Icon name="badgeCheck" size={14} />} onClick={() => setPayrollStatus(r.id, 'approved')}>Approve</Button>;
    if (r.payrollStatus === 'approved')
      return <Button variant="accent" size="sm" full={full} iconLeft={<Icon name="wallet" size={14} />} onClick={() => setPayFor(r)}>Mark paid</Button>;
    return <Badge variant="paid" size="sm" dot>Paid</Badge>;
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
    { key: 'gross', header: 'Gross', align: 'right', render: (r) => <span style={mono}>{formatINR(r.salary)}</span> },
    { key: 'worked', header: 'Worked', align: 'right', render: (r) => <span style={{ ...mono, color: 'var(--text-body)' }}>{r.worked} d</span> },
    {
      key: 'leave',
      header: 'Leave (used/free)',
      align: 'right',
      render: (r) => {
        const b = employeeBreakdown(r);
        return (
          <span style={mono}>
            <span style={{ color: r.leaveUsed > b.freeLeaveAllowed ? 'var(--coral-600)' : 'var(--text-body)' }}>{r.leaveUsed}</span>
            <span style={{ color: 'var(--text-subtle)' }}> / {b.freeLeaveAllowed}</span>
          </span>
        );
      },
    },
    {
      key: 'ded',
      header: 'Deduction',
      align: 'right',
      render: (r) => {
        const b = employeeBreakdown(r);
        return <span style={{ ...mono, fontWeight: b.leaveDeduction > 0 ? 700 : 400, color: b.leaveDeduction > 0 ? 'var(--coral-600)' : 'var(--text-body)' }}>{b.leaveDeduction > 0 ? '−' + formatINR(b.leaveDeduction) : '—'}</span>;
      },
    },
    { key: 'tiffin', header: 'Tiffin CTC', align: 'right', render: (r) => <span style={{ ...mono, color: 'var(--blue-600)' }}>+{formatINR(employeeBreakdown(r).tiffinTotal)}</span> },
    { key: 'net', header: 'Net payable', align: 'right', render: (r) => <span style={{ ...mono, fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR(employeeBreakdown(r).finalPayable)}</span> },
    { key: 'status', header: 'Status', render: (r) => { const s = PAYROLL_STATUS_META[r.payrollStatus]; return <Badge variant={s.variant} dot>{s.label}</Badge>; } },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <StatusAction r={r} />
          <IconButton icon="eye" label="View slip" size="sm" onClick={() => setSlip(r)} />
        </div>
      ),
    },
  ];

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
        <div style={{ minWidth: 160, flex: '1 1 160px' }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="All branches" options={['', ...BRANCH_NAMES]} />
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
          minWidth={1040}
          emptyText="No salaries match this filter."
          mobileCard={(r) => {
            const b = employeeBreakdown(r);
            const s = PAYROLL_STATUS_META[r.payrollStatus];
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 12px', background: 'var(--indigo-50)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net payable</span>
                  <span style={{ fontSize: 18, fontWeight: 800, ...mono, color: 'var(--indigo-700)' }}>{formatINR(b.finalPayable)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                  <Kv label="Gross" value={formatINR(r.salary)} />
                  <Kv label="Worked" value={`${r.worked} d`} />
                  <Kv label="Leave" value={`${r.leaveUsed} / ${b.freeLeaveAllowed}`} />
                  <Kv label="Deduction" value={b.leaveDeduction > 0 ? '−' + formatINR(b.leaveDeduction) : '—'} color={b.leaveDeduction > 0 ? 'var(--coral-600)' : undefined} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <StatusAction r={r} full />
                  <Button variant="secondary" full size="sm" iconLeft={<Icon name="eye" size={15} />} onClick={() => setSlip(r)}>Slip</Button>
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
          defaultAmount={String(employeeBreakdown(payFor).finalPayable)}
          onClose={() => setPayFor(null)}
          onSave={(p) => {
            addPayment(payFor.id, p);
            setPayrollStatus(payFor.id, 'paid');
            setPayFor(null);
          }}
        />
      )}
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

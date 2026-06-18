import { useState } from 'react';
import { Avatar, Badge, Button, Card, Icon, ResponsiveTable, Select, Tabs, type Column } from '../components/ui';
import { ApplyLeaveModal } from '../components/payroll/ApplyLeaveModal';
import { useAppStore } from '../store/AppStore';
import { isActiveEmployee } from '../lib/payroll';
import { branchFilterOptions, employeeInBranch } from '../lib/branches';
import type { Employee, LeaveRequest, LeaveStatus } from '../types';

type Row = LeaveRequest & { empId: string; empName: string; branch: string };

const STATUS_META: Record<LeaveStatus, { label: string; variant: 'pending' | 'eligible' | 'rejected' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  approved: { label: 'Approved', variant: 'eligible' },
  rejected: { label: 'Rejected', variant: 'rejected' },
};

export function LeavePage() {
  const { employees, branches, setLeaveStatus } = useAppStore();
  const [tab, setTab] = useState<'all' | LeaveStatus>('all');
  const [branch, setBranch] = useState('');
  const [applyForId, setApplyForId] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);

  const inBranch = (e: Employee) => employeeInBranch(e, branch, branches);
  const rows: Row[] = employees
    .filter(inBranch)
    .flatMap((e) => e.leaves.map((l) => ({ ...l, empId: e.id, empName: e.name, branch: e.branch })))
    .filter((r) => tab === 'all' || r.status === tab);

  const count = (s: LeaveStatus) => employees.filter(inBranch).flatMap((e) => e.leaves).filter((l) => l.status === s).length;
  const applyEmployees = employees.filter((e) => isActiveEmployee(e) && inBranch(e));
  const applyFor = employees.find((e) => e.id === applyForId) ?? applyEmployees[0];

  const columns: Column<Row>[] = [
    {
      key: 'emp',
      header: 'Employee',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={r.empName} size={32} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{r.empName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.branch}</div>
          </div>
        </div>
      ),
    },
    { key: 'dates', header: 'Dates', render: (r) => r.dateLabel },
    { key: 'days', header: 'Days', align: 'right', render: (r) => <span style={{ fontFamily: 'var(--font-mono)' }}>{r.days}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge variant="neutral" size="sm">{r.type}</Badge> },
    { key: 'impact', header: 'Paid / deduction', render: (r) => (r.status === 'rejected' ? <span style={{ color: 'var(--text-subtle)' }}>—</span> : r.paid ? <Badge variant="eligible" size="sm" dot>Paid leave</Badge> : <Badge variant="deductible" size="sm" dot>Deductible</Badge>) },
    { key: 'reason', header: 'Reason', render: (r) => <span style={{ color: 'var(--text-muted)' }}>{r.reason}</span>, hideOnMobile: true },
    { key: 'status', header: 'Status', render: (r) => { const m = STATUS_META[r.status]; return <Badge variant={m.variant} dot>{m.label}</Badge>; } },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) =>
        r.status === 'pending' ? (
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <Button variant="primary" size="sm" iconLeft={<Icon name="check" size={14} />} onClick={() => setLeaveStatus(r.empId, r.id, 'approved')}>Approve</Button>
            <Button variant="ghost" size="sm" onClick={() => setLeaveStatus(r.empId, r.id, 'rejected')}>Reject</Button>
          </div>
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{r.paid ? 'Paid' : r.status === 'approved' ? 'Unpaid' : '—'}</span>
        ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          items={[
            { id: 'all', label: 'All', count: rows.length },
            { id: 'pending', label: 'Pending', icon: 'clock', count: count('pending') },
            { id: 'approved', label: 'Approved', count: count('approved') },
            { id: 'rejected', label: 'Rejected', count: count('rejected') },
          ]}
        />
        <div style={{ flex: 1 }} />
        <div style={{ minWidth: 150, flex: '0 1 170px' }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={branchFilterOptions(branches)} />
        </div>
        <div style={{ minWidth: 150, flex: '0 1 190px' }}>
          <Select value={applyForId || applyEmployees[0]?.id || ''} onChange={(e) => setApplyForId(e.target.value)} options={applyEmployees.map((e) => ({ value: e.id, label: e.name }))} />
        </div>
        <Button variant="primary" iconLeft={<Icon name="plus" size={17} />} disabled={!applyFor} onClick={() => setApplyOpen(true)}>Apply leave</Button>
      </div>

      <Card title="Leave requests" subtitle="Apply, approve & track — paid/unpaid is auto-calculated" padding="0">
        <ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r.empId + r.id} minWidth={860} emptyText="No leave requests match this filter." />
      </Card>

      {applyOpen && applyFor && <ApplyLeaveModal employee={applyFor} onClose={() => setApplyOpen(false)} />}
    </div>
  );
}

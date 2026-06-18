import { useMemo, useState } from 'react';
import { Badge, Button, Card, Icon, IconButton, Input, Modal, ResponsiveTable, Select, StatCard, Switch, useConfirm, type Column } from '../components/ui';
import { useAppStore, type BulkTiffinAction } from '../store/AppStore';
import { employeeTiffinPerDay, employeeTiffinTotal, isActiveEmployee } from '../lib/payroll';
import { branchFilterOptions, employeeInBranch } from '../lib/branches';
import { downloadCsv } from '../lib/download';
import { formatINR0, tiffinPerDay } from '../services';
import { CURRENT_MONTH } from '../data';
import type { Branch, Employee, TiffinLabel } from '../types';

const mono = { fontFamily: 'var(--font-mono)' as const };

export function TiffinPage() {
  const { employees, branches, tiffinLabels, addTiffinLabel, updateTiffinLabel, removeTiffinLabel, markTiffinDay, bulkTiffin, autoMarkTiffinFromAttendance } = useAppStore();
  const confirm = useConfirm();
  const [labelModal, setLabelModal] = useState<{ mode: 'add' | 'edit'; label?: TiffinLabel } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const totalTiffin = employees.reduce((s, e) => s + employeeTiffinTotal(e, tiffinLabels), 0);
  const totalDays = employees.reduce((s, e) => s + e.tiffinDays, 0);
  const perDay = tiffinPerDay(tiffinLabels);

  const remove = async (t: TiffinLabel) => {
    const ok = await confirm({ title: 'Remove tiffin label?', message: `Remove “${t.label}” (${formatINR0(t.amount)}/day) from the company tiffin list.`, confirmLabel: 'Remove', tone: 'danger', icon: 'trash' });
    if (ok) removeTiffinLabel(t.id);
  };

  const autoMark = async () => {
    const eligible = employees.filter((e) => e.status === 'active' && e.tiffinEnabled !== false).length;
    const ok = await confirm({
      title: 'Auto-mark tiffin from attendance?',
      message: `Tiffin days for ${eligible} active employee${eligible === 1 ? '' : 's'} will be recomputed from this month's attendance — present = 1 day, half-day = 0.5 (if eligible), absent / leave / off = none. This replaces their current tiffin-day counts and never changes net salary.`,
      confirmLabel: 'Auto-mark tiffin',
      tone: 'primary',
      icon: 'utensils',
    });
    if (ok) autoMarkTiffinFromAttendance();
  };

  const exportCsv = () =>
    downloadCsv(`tiffin-${CURRENT_MONTH.short}.csv`, [
      ['Employee', 'Branch', 'Days', 'Per day', 'Tiffin CTC'],
      ...employees.map((e) => [e.name, e.branch, e.tiffinDays, employeeTiffinPerDay(e, tiffinLabels), employeeTiffinTotal(e, tiffinLabels)]),
      ['Total', '', '', '', totalTiffin],
    ]);

  const columns: Column<Employee>[] = [
    { key: 'emp', header: 'Employee', render: (e) => <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{e.name}</span> },
    { key: 'branch', header: 'Branch', render: (e) => <span style={{ color: 'var(--text-muted)' }}>{e.branch}</span> },
    { key: 'days', header: 'Days', align: 'right', render: (e) => <span style={mono}>{e.tiffinDays}</span> },
    { key: 'perday', header: 'Per day', align: 'right', render: (e) => <span style={{ ...mono, color: 'var(--text-muted)' }}>{formatINR0(employeeTiffinPerDay(e, tiffinLabels))}</span> },
    { key: 'ctc', header: 'Tiffin CTC', align: 'right', render: (e) => <span style={{ ...mono, fontWeight: 700, color: 'var(--blue-600)' }}>{formatINR0(employeeTiffinTotal(e, tiffinLabels))}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="gx-grid gx-grid-stats3">
        <StatCard label="Tiffin CTC — March" value={formatINR0(totalTiffin).replace('₹', '')} prefix="₹" icon="utensils" tone="blue" footnote="paid on top of salary" />
        <StatCard label="Tiffin days" value={totalDays} icon="calendar" tone="brand" footnote="across all employees" />
        <StatCard label="Standard rate / day" value={formatINR0(perDay).replace('₹', '')} prefix="₹" icon="rupee" tone="green" footnote="sum of all labels" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, alignItems: 'start' }}>
        <Card title="Tiffin labels" subtitle="Custom, company-paid CTC" action={<Button variant="tonal" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={() => setLabelModal({ mode: 'add' })}>Add label</Button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tiffinLabels.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--blue-50)', color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="utensils" size={17} />
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{t.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, ...mono, color: 'var(--text-strong)' }}>{formatINR0(t.amount)}</span>
                <IconButton icon="pencil" label="Edit label" size="sm" onClick={() => setLabelModal({ mode: 'edit', label: t })} />
                <IconButton icon="trash" label="Remove label" size="sm" onClick={() => remove(t)} />
              </div>
            ))}
            {tiffinLabels.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 2px' }}>No tiffin labels — add one to start.</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
              <span>Per full day</span>
              <span style={{ ...mono, color: 'var(--text-strong)', fontWeight: 700 }}>{formatINR0(perDay)}</span>
            </div>
            <Switch checked label="Half-day tiffin eligible (default)" description="New employees inherit this; configurable per employee" />
            <Button variant="secondary" full iconLeft={<Icon name="utensils" size={16} />} onClick={() => markTiffinDay()}>Mark today's tiffin given</Button>
            <Button variant="secondary" full iconLeft={<Icon name="calendar" size={16} />} onClick={autoMark}>Auto-mark tiffin from attendance</Button>
            <Button variant="tonal" full iconLeft={<Icon name="users" size={16} />} onClick={() => setBulkOpen(true)}>Bulk tiffin (enable / days)</Button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
              <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
              Tiffin is never a deduction. No tiffin is paid on paid-leave days.
            </div>
          </div>
        </Card>

        <Card title="Tiffin report" subtitle="Separately tracked & reportable" padding="0" action={<Button variant="secondary" size="sm" iconLeft={<Icon name="download" size={15} />} onClick={exportCsv}>Export</Button>}>
          <ResponsiveTable columns={columns} rows={employees} rowKey={(e) => e.id} minWidth={560} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-inset)' }}>
            <Badge variant="info" icon="utensils">Company-paid CTC</Badge>
            <span style={{ fontSize: 14, ...mono, fontWeight: 800, color: 'var(--blue-700)' }}>Total {formatINR0(totalTiffin)}</span>
          </div>
        </Card>
      </div>

      {labelModal && (
        <TiffinLabelModal
          initial={labelModal.label}
          onClose={() => setLabelModal(null)}
          onSave={(label, amount) => {
            if (labelModal.mode === 'edit' && labelModal.label) updateTiffinLabel(labelModal.label.id, { label, amount });
            else addTiffinLabel({ label, amount });
            setLabelModal(null);
          }}
        />
      )}

      {bulkOpen && (
        <BulkTiffinModal
          employees={employees}
          branches={branches}
          onClose={() => setBulkOpen(false)}
          onApply={(ids, action) => { bulkTiffin(ids, action); setBulkOpen(false); }}
        />
      )}
    </div>
  );
}

const BULK_ACTIONS: { value: BulkTiffinAction; label: string }[] = [
  { value: 'enable', label: 'Enable tiffin' },
  { value: 'disable', label: 'Disable tiffin' },
  { value: 'addDay', label: 'Add 1 tiffin day' },
  { value: 'removeDay', label: 'Remove 1 tiffin day' },
  { value: 'reset', label: 'Reset tiffin days to 0' },
];

function BulkTiffinModal({ employees, branches, onClose, onApply }: { employees: Employee[]; branches: Branch[]; onClose: () => void; onApply: (ids: string[], action: BulkTiffinAction) => void }) {
  const [branchCode, setBranchCode] = useState('');
  const [action, setAction] = useState<BulkTiffinAction>('enable');
  const targets = useMemo(
    () => employees.filter((e) => isActiveEmployee(e) && employeeInBranch(e, branchCode, branches)),
    [employees, branchCode, branches],
  );
  return (
    <Modal
      icon="users"
      title="Bulk tiffin"
      subtitle="Apply a tiffin change to many employees at once"
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={targets.length === 0} onClick={() => onApply(targets.map((e) => e.id), action)}>Apply to {targets.length}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Branch" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} options={branchFilterOptions(branches)} />
        <Select label="Action" value={action} onChange={(e) => setAction(e.target.value as BulkTiffinAction)} options={BULK_ACTIONS} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
          <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
          {targets.length} active employee{targets.length === 1 ? '' : 's'} will be affected. Tiffin is company-paid CTC and never changes net salary.
        </div>
      </div>
    </Modal>
  );
}

function TiffinLabelModal({ initial, onClose, onSave }: { initial?: TiffinLabel; onClose: () => void; onSave: (label: string, amount: number) => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const valid = label.trim() && amount !== '' && Number(amount) >= 0;
  return (
    <Modal
      icon="utensils"
      title={initial ? 'Edit tiffin label' : 'Add tiffin label'}
      subtitle="Company-paid CTC — taken daily at the branch"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={!valid} onClick={() => onSave(label.trim(), Number(amount))}>{initial ? 'Save' : 'Add label'}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Breakfast" icon="utensils" />
        <Input label="Amount per day" prefix="₹" mono value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </div>
    </Modal>
  );
}

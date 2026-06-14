import { useState } from 'react';
import { Badge, Button, Card, Icon, Input, Modal, ResponsiveTable, Select, StatCard, type Column } from '../components/ui';
import { OVERRIDE_FIELDS, useAppStore, type OverrideField } from '../store/AppStore';
import type { AuditEntry, Employee } from '../types';

const mono = { fontFamily: 'var(--font-mono)' as const };

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function AuditLogPage() {
  const { auditLog, employees } = useAppStore();
  const [overrideOpen, setOverrideOpen] = useState(false);

  const columns: Column<AuditEntry>[] = [
    { key: 'at', header: 'When', render: (a) => <span style={{ ...mono, fontSize: 12 }}>{when(a.at)}</span> },
    { key: 'by', header: 'Changed by', render: (a) => <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{a.by}</span> },
    { key: 'entity', header: 'Entity', render: (a) => <Badge variant="neutral" size="sm">{a.entity}</Badge> },
    { key: 'target', header: 'Target', render: (a) => <span style={{ color: 'var(--text-body)' }}>{a.target}</span> },
    { key: 'field', header: 'Field', render: (a) => a.field },
    { key: 'change', header: 'Old → New', render: (a) => (<span style={mono}><span style={{ color: 'var(--coral-600)' }}>{a.oldValue}</span> → <span style={{ color: 'var(--green-700)' }}>{a.newValue}</span></span>) },
    { key: 'reason', header: 'Reason', render: (a) => <span style={{ color: 'var(--text-muted)' }}>{a.reason || '—'}</span>, hideOnMobile: true },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="gx-grid gx-grid-stats3">
        <StatCard label="Audit entries" value={auditLog.length} icon="shield" tone="brand" footnote="all overrides logged" />
        <StatCard label="Overrides today" value={auditLog.filter((a) => new Date(a.at).toDateString() === new Date().toDateString()).length} icon="history" tone="amber" />
        <StatCard label="Employees" value={employees.length} icon="users" tone="blue" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }} />
        <Button variant="accent" iconLeft={<Icon name="pencil" size={16} />} onClick={() => setOverrideOpen(true)}>Override a record</Button>
      </div>

      <Card title="Audit log" subtitle="Every manual override is recorded — no silent changes" padding="0">
        <ResponsiveTable columns={columns} rows={auditLog} rowKey={(a) => a.id} minWidth={900} emptyText="No overrides recorded yet." />
      </Card>

      {overrideOpen && <OverrideModal onClose={() => setOverrideOpen(false)} />}
    </div>
  );
}

function OverrideModal({ onClose }: { onClose: () => void }) {
  const { employees, overrideEmployeeField } = useAppStore();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [field, setField] = useState<OverrideField>('salary');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  const emp = employees.find((e) => e.id === employeeId) as Employee | undefined;
  const current = emp ? (emp[field] as number) : 0;
  const valid = emp && value !== '' && !Number.isNaN(Number(value)) && reason.trim().length > 0;

  const save = () => {
    if (!valid || !emp) return;
    overrideEmployeeField(emp.id, field, Number(value), reason.trim());
    onClose();
  };

  return (
    <Modal
      icon="shield"
      title="Override a record"
      subtitle="Changes are written to the audit log"
      onClose={onClose}
      width={500}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={!valid} onClick={save}>Apply override</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} options={employees.map((e) => ({ value: e.id, label: `${e.name} · ${e.id}` }))} />
        <Select label="Field" value={field} onChange={(e) => setField(e.target.value as OverrideField)} options={(Object.keys(OVERRIDE_FIELDS) as OverrideField[]).map((k) => ({ value: k, label: OVERRIDE_FIELDS[k] }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Current value" mono value={String(current)} disabled />
          <Input label="New value" mono value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
        </div>
        <Input label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being overridden?" required />
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--amber-700)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <Icon name="info" size={14} style={{ marginTop: 1 }} />
          This change recalculates salary/eligibility live and is permanently logged with your name, the old and new values, and the reason.
        </div>
      </div>
    </Modal>
  );
}

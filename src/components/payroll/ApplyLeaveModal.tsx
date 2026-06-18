import { useState } from 'react';
import { Badge, Button, Input, Modal, Select } from '../ui';
import { useAppStore } from '../../store/AppStore';
import { daysBetween, estimateLeaveImpact } from '../../lib/leaveCalc';
import { formatINR0 } from '../../services';
import type { Employee, LeaveType } from '../../types';

const TYPES: LeaveType[] = ['Casual', 'Sick', 'Earned', 'Other'];

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** Apply for leave with a date range + live salary-impact preview (Part A/B). */
export function ApplyLeaveModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { addLeaveRequest } = useAppStore();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [type, setType] = useState<LeaveType>('Casual');
  const [reason, setReason] = useState('');

  const days = daysBetween(start, end || start);
  const impact = estimateLeaveImpact(employee, days);
  const valid = days > 0 && reason.trim().length > 0;

  const submit = () => {
    if (!valid) return;
    const dateLabel = start === end || !end ? fmt(start) : `${fmt(start)}–${fmt(end)}`;
    addLeaveRequest(employee.id, { dateLabel, days, type, reason: reason.trim(), status: 'pending' });
    onClose();
  };

  return (
    <Modal
      icon="calendar"
      title="Apply for leave"
      subtitle={`${employee.name} · ${employee.id}`}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={!valid} onClick={submit}>Submit leave request</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="End date" type="date" value={end} onChange={(e) => setEnd(e.target.value)} hint={start && !end ? 'Defaults to start date' : undefined} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Leave type" value={type} onChange={(e) => setType(e.target.value as LeaveType)} options={TYPES} />
          <Input label="Days" value={String(days)} disabled mono />
        </div>
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family function" required />

        <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated impact</span>
            <Badge variant={impact.eligible ? 'eligible' : 'noteligible'} dot>{impact.eligible ? 'Leave eligible' : 'No free leave'}</Badge>
          </div>
          <Row label="Monthly salary" value={formatINR0(impact.monthlySalary)} />
          <Row label={`Daily salary (${impact.basis === 'fixed30' ? 'fixed 30-day' : 'calendar-day'})`} value={formatINR0(impact.dailySalary)} />
          <Row label="Leave days requested" value={String(impact.requestedDays)} />
          <Row label="Free/paid leave available" value={`${impact.freeLeaveAvailable} / ${impact.freeLeaveAllowed}`} />
          <Row label="Paid (free) days" value={String(impact.paidDays)} tone="green" />
          <Row label="Deductible days" value={String(impact.deductibleDays)} tone={impact.deductibleDays > 0 ? 'coral' : undefined} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>Estimated salary deduction</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: impact.deduction > 0 ? 'var(--coral-600)' : 'var(--green-700)' }}>{impact.deduction > 0 ? '− ' + formatINR0(impact.deduction) : formatINR0(0)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'coral' }) {
  const color = tone === 'green' ? 'var(--green-700)' : tone === 'coral' ? 'var(--coral-600)' : 'var(--text-strong)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</span>
    </div>
  );
}

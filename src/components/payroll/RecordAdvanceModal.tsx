import { useState } from 'react';
import { Button, Chip, Input, Modal, Select, UploadZone } from '../ui';
import { buildAdvanceSchedule, formatINR0 } from '../../services';
import { CURRENT_MONTH } from '../../data';
import type { Advance, PaymentMethod } from '../../types';

const METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

export function RecordAdvanceModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (advance: Omit<Advance, 'id'>) => void; initial?: Advance }) {
  const editing = !!initial;
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.date ?? `12 ${CURRENT_MONTH.short}`);
  const [method, setMethod] = useState<PaymentMethod>(initial?.method ?? 'Cash');
  const [ref, setRef] = useState(initial?.ref ?? '');
  const [note, setNote] = useState(initial?.note && initial.note !== '—' ? initial.note : '');
  const [monthly, setMonthly] = useState(initial?.plan ? String(initial.plan.monthlyAmount) : '');
  const [startMonth, setStartMonth] = useState(initial?.plan?.startMonth ?? CURRENT_MONTH.short);

  const amt = Number(amount) || 0;
  const monthlyAmt = Number(monthly) || 0;
  const schedule = amt > 0 && monthlyAmt > 0 ? buildAdvanceSchedule(amt, monthlyAmt, startMonth) : [];

  const preset = (months: number) => setMonthly(amt > 0 ? String(Math.ceil(amt / months)) : '');

  const save = () =>
    onSave({
      amount: amt,
      date,
      method,
      ref: ref || 'ADV-0320',
      note: note || '—',
      cleared: initial?.cleared ?? false,
      plan: schedule.length ? { monthlyAmount: monthlyAmt, months: schedule.length, startMonth } : undefined,
      schedule: schedule.length ? schedule : undefined,
    });

  return (
    <Modal
      icon="banknote"
      title={editing ? 'Edit advance' : 'Record advance'}
      subtitle={editing ? 'Update this advance entry' : "Add to the employee's advance ledger"}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full onClick={save} disabled={amt <= 0}>{editing ? 'Save changes' : 'Save advance'}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Amount" prefix="₹" mono value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          <Input label="Date" value={date} onChange={(e) => setDate(e.target.value)} icon="calendar" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={METHODS} />
          <Input label="Reference no. (optional)" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="ADV-0320" mono />
        </div>
        <Input label="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for advance" />

        {/* Repayment plan */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Salary adjustment plan</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Chip kind="filter" onClick={() => preset(1)}>Full next month</Chip>
            <Chip kind="filter" onClick={() => preset(2)}>2 months</Chip>
            <Chip kind="filter" onClick={() => preset(3)}>3 months</Chip>
            <Chip kind="filter" onClick={() => preset(4)}>4 months</Chip>
            <Chip kind="filter" onClick={() => setMonthly('')}>Custom</Chip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Monthly adjustment" prefix="₹" mono value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="e.g. 2500" />
            <Input label="Start month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} icon="calendar" />
          </div>

          {schedule.length > 0 ? (
            <div style={{ marginTop: 12, background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 6 }}>
                <span>{schedule.length} month{schedule.length > 1 ? 's' : ''} · {formatINR0(monthlyAmt)}/mo</span>
                <span>ends {schedule[schedule.length - 1].month}</span>
              </div>
              <div className="gx-scroll" style={{ maxHeight: 132, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {schedule.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-body)', fontFamily: 'var(--font-mono)' }}>
                    <span>{s.month}</span>
                    <span>−{formatINR0(s.amount)} · bal {formatINR0(s.balanceAfter)}{s.balanceAfter === 0 ? ' ✓' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Set a monthly amount to schedule recovery, or leave blank to adjust manually later.</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginBottom: 7 }}>Receipt (optional)</div>
          {/* TODO(backend): store the uploaded file bytes; metadata only for now. */}
          <UploadZone />
        </div>
      </div>
    </Modal>
  );
}

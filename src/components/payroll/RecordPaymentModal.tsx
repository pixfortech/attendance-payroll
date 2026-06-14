import { useState } from 'react';
import { Button, Icon, Input, Modal, Select, UploadZone } from '../ui';
import { CURRENT_MONTH } from '../../data';
import type { Payment, PaymentMethod, PaymentType } from '../../types';

const METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];
const TYPES: PaymentType[] = ['Salary', 'Advance', 'Tiffin (CTC)', 'Bonus', 'Incentive', 'Deduction adjustment', 'Other'];

export function RecordPaymentModal({
  onClose,
  onSave,
  defaultType = 'Salary',
  defaultAmount = '',
}: {
  onClose: () => void;
  onSave: (payment: Omit<Payment, 'id'>) => void;
  defaultType?: PaymentType;
  defaultAmount?: string;
}) {
  const [type, setType] = useState<PaymentType>(defaultType);
  const [period, setPeriod] = useState<string>(CURRENT_MONTH.short);
  const [date, setDate] = useState(`12 ${CURRENT_MONTH.short}`);
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState<PaymentMethod>('Bank Transfer');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');

  const save = () =>
    onSave({
      type,
      period,
      date,
      amount: Number(amount) || 0,
      method,
      ref: ref || '—',
      note: note || undefined,
      status: 'pending',
    });

  return (
    <Modal
      icon="wallet"
      title="Record payment"
      subtitle="Mark a payment as paid — employee confirms receipt"
      onClose={onClose}
      width={500}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" full iconLeft={<Icon name="check" size={16} />} onClick={save}>
            Mark as paid
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Payment type" value={type} onChange={(e) => setType(e.target.value as PaymentType)} options={TYPES} />
          <Input label="Amount" prefix="₹" mono value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={METHODS} />
          <Input label="Payment date" value={date} onChange={(e) => setDate(e.target.value)} icon="calendar" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Reference / txn no." value={ref} onChange={(e) => setRef(e.target.value)} placeholder="TXN-000000" mono />
          <Input label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <Input label="Notes (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any remark" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginBottom: 7 }}>Receipt (optional)</div>
          <UploadZone />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--blue-700)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <Icon name="info" size={14} style={{ marginTop: 1 }} />
          <span>
            The employee gets a notification and must confirm receipt. Status starts as{' '}
            <strong>Pending confirmation</strong>.
          </span>
        </div>
      </div>
    </Modal>
  );
}

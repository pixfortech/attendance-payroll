import { useState } from 'react';
import { Button, Icon, Input, Modal, Select, UploadZone } from '../ui';
import { CURRENT_MONTH } from '../../data';
import type { Advance, PaymentMethod } from '../../types';

const METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

export function RecordAdvanceModal({ onClose, onSave }: { onClose: () => void; onSave: (advance: Omit<Advance, 'id'>) => void }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(`12 ${CURRENT_MONTH.short}`);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');

  const save = () =>
    onSave({
      amount: Number(amount) || 0,
      date,
      method,
      ref: ref || 'ADV-0320',
      note: note || '—',
      cleared: false,
    });

  return (
    <Modal
      icon="banknote"
      title="Record advance"
      subtitle="Add to the employee's advance ledger"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" full onClick={save}>
            Save advance
          </Button>
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
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginBottom: 7 }}>Receipt (optional)</div>
          <UploadZone />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
          <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
          Advances are recoverable against upcoming salary and can be adjusted any time.
        </div>
      </div>
    </Modal>
  );
}

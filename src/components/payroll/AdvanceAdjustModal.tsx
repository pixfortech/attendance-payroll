import { useMemo, useState } from 'react';
import { Badge, Button, Chip, Icon, Input, Modal, Switch } from '../ui';
import { useAppStore } from '../../store/AppStore';
import { employeeBreakdown, employeeOutstandingAdvance } from '../../lib/payroll';
import { advanceAdjustmentForMonth, formatINR0, round2 } from '../../services';
import { CURRENT_MONTH } from '../../data';
import type { Employee } from '../../types';

type Mode = 'terms' | 'fixed' | 'percent' | 'full' | 'skip' | 'custom';
const MODES: { id: Mode; label: string }[] = [
  { id: 'terms', label: 'Repayment terms' },
  { id: 'fixed', label: 'Fixed monthly' },
  { id: 'percent', label: '% of salary' },
  { id: 'full', label: 'Full remaining' },
  { id: 'custom', label: 'Custom' },
  { id: 'skip', label: 'Skip this month' },
];

/** Adjust an employee's advance against this month's salary (Phase 3B, Part F). */
export function AdvanceAdjustModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { applyAdvanceAdjustment } = useAppStore();
  const b = employeeBreakdown(employee);
  const remaining = employeeOutstandingAdvance(employee);
  const totalAdvance = employee.advances.reduce((s, a) => s + a.amount, 0);
  const alreadyAdjusted = round2(totalAdvance - remaining);
  const suggested = Math.min(remaining, advanceAdjustmentForMonth(employee.advances, CURRENT_MONTH.short) || employee.advances.find((a) => a.plan)?.plan?.monthlyAmount || 0);
  const netBeforeAdvance = b.salaryPayable; // gross − attendance/other deductions, before advance

  const [mode, setMode] = useState<Mode>(suggested > 0 ? 'terms' : 'full');
  const [percent, setPercent] = useState('10');
  const [override, setOverride] = useState(false);

  const computed = useMemo(() => {
    switch (mode) {
      case 'terms': return suggested;
      case 'fixed': return Math.min(remaining, employee.advances.find((a) => a.plan)?.plan?.monthlyAmount || suggested || 0);
      case 'percent': return Math.min(remaining, round2((netBeforeAdvance * (Number(percent) || 0)) / 100));
      case 'full': return remaining;
      case 'skip': return 0;
      default: return suggested || remaining;
    }
  }, [mode, percent, suggested, remaining, netBeforeAdvance, employee.advances]);

  const [amount, setAmount] = useState(String(computed));
  // When a preset is chosen, sync the editable amount (custom keeps user input).
  const effective = mode === 'custom' ? Number(amount) || 0 : computed;
  const balanceAfter = round2(Math.max(0, remaining - effective));
  const exceedsNet = effective > netBeforeAdvance;
  const valid = effective >= 0 && effective <= remaining && (mode === 'skip' || effective > 0) && (!exceedsNet || override);

  const pickMode = (m: Mode) => {
    setMode(m);
    if (m !== 'custom') {
      const v = m === 'terms' ? suggested : m === 'fixed' ? Math.min(remaining, employee.advances.find((a) => a.plan)?.plan?.monthlyAmount || suggested || 0) : m === 'percent' ? Math.min(remaining, round2((netBeforeAdvance * (Number(percent) || 0)) / 100)) : m === 'full' ? remaining : 0;
      setAmount(String(v));
    }
  };

  const apply = () => {
    if (!valid) return;
    if (mode !== 'skip' && effective > 0) applyAdvanceAdjustment(employee.id, effective);
    onClose();
  };

  return (
    <Modal
      icon="banknote"
      title="Adjust advance against salary"
      subtitle={`${employee.name} · ${employee.id} · ${CURRENT_MONTH.label}`}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={!valid} onClick={apply}>{mode === 'skip' ? 'Skip this month' : 'Apply adjustment'}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <Stat label="Net payable (before advance)" value={formatINR0(netBeforeAdvance)} />
          <Stat label="Total advance taken" value={formatINR0(totalAdvance)} />
          <Stat label="Already adjusted" value={formatINR0(alreadyAdjusted)} />
          <Stat label="Remaining balance" value={formatINR0(remaining)} strong />
        </div>

        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-body)', marginBottom: 8 }}>Adjustment method</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODES.map((m) => (
              <Chip key={m.id} kind="filter" active={mode === m.id} onClick={() => pickMode(m.id)}>{m.label}</Chip>
            ))}
          </div>
        </div>

        {mode === 'percent' && (
          <Input label="Percent of net payable" suffix="%" value={percent} onChange={(e) => { setPercent(e.target.value); setAmount(String(Math.min(remaining, round2((netBeforeAdvance * (Number(e.target.value) || 0)) / 100)))); }} mono />
        )}

        <Input
          label="Adjustment this month"
          prefix="₹"
          mono
          value={mode === 'custom' ? amount : String(effective)}
          onChange={(e) => { setMode('custom'); setAmount(e.target.value); }}
          hint={suggested > 0 ? `Repayment terms suggest ${formatINR0(suggested)} this month` : undefined}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--indigo-700)' }}>Balance after this adjustment</span>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--indigo-700)' }}>{formatINR0(balanceAfter)}</span>
        </div>

        {effective > remaining && <Note tone="coral">Adjustment exceeds the remaining advance balance.</Note>}
        {exceedsNet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Note tone="amber">This exceeds the net salary payable ({formatINR0(netBeforeAdvance)}).</Note>
            <Switch checked={override} onChange={setOverride} label="Admin override — allow exceeding net payable" />
          </div>
        )}
        {balanceAfter === 0 && effective > 0 && <Badge variant="confirmed" icon="circleCheck">Advance fully cleared after this adjustment</Badge>}
      </div>
    </Modal>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: strong ? 15 : 13.5, fontWeight: strong ? 800 : 600, fontFamily: 'var(--font-mono)', color: strong ? 'var(--coral-600)' : 'var(--text-strong)' }}>{value}</span>
    </div>
  );
}
function Note({ tone, children }: { tone: 'coral' | 'amber'; children: React.ReactNode }) {
  const c = tone === 'coral' ? ['var(--coral-700)', 'var(--coral-50)', 'var(--coral-100)'] : ['var(--amber-700)', 'var(--amber-50)', 'var(--amber-100)'];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: c[0], background: c[1], border: `1px solid ${c[2]}`, borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
      <Icon name="alert" size={14} style={{ marginTop: 1 }} /> {children}
    </div>
  );
}

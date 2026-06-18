import { Badge, Button, Icon, Modal } from '../ui';
import { formatINR0 } from '../../services';
import type { Advance, Employee } from '../../types';

/** Detailed advance + repayment schedule (Phase 3B, Part H). Shared by the
 *  employee portal (own advances) and admin Employee Detail → Advance. */
export function AdvanceDetailModal({ advance, employee, onClose }: { advance: Advance; employee: Employee; onClose: () => void }) {
  const recovered = advance.recovered ?? 0;
  const remaining = advance.cleared ? 0 : Math.max(0, advance.amount - recovered);
  const totalAdjusted = advance.cleared ? advance.amount : recovered;
  const status = advance.cleared ? 'Cleared' : recovered > 0 ? 'Partially adjusted' : 'Active';
  const statusVariant = advance.cleared ? 'confirmed' : recovered > 0 ? 'pending' : 'brand';
  const schedule = advance.schedule ?? [];
  const expectedClearing = schedule.length ? schedule[schedule.length - 1].month : advance.plan?.startMonth ?? '—';

  return (
    <Modal
      icon="banknote"
      title="Advance detail"
      subtitle={`${employee.name} · ${employee.id}`}
      onClose={onClose}
      width={520}
      footer={<Button variant="primary" full onClick={onClose}>Close</Button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{formatINR0(advance.amount)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{advance.date} · {advance.method}</div>
          </div>
          <Badge variant={statusVariant} dot>{status}</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <Row label="Reason / note" value={advance.note && advance.note !== '—' ? advance.note : '—'} />
          <Row label="Reference" value={advance.ref || '—'} />
          <Row label="Repayment terms" value={advance.plan ? `${formatINR0(advance.plan.monthlyAmount)}/mo × ${advance.plan.months}` : 'Manual / none'} />
          <Row label="Expected clearing" value={expectedClearing} />
          <Row label="Total adjusted" value={formatINR0(totalAdjusted)} />
          <Row label="Remaining balance" value={formatINR0(remaining)} strong />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Repayment schedule</div>
          {schedule.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>No fixed schedule — adjusted manually against salary.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {schedule.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, fontFamily: 'var(--font-mono)', padding: '7px 10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-body)' }}>{s.month}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--coral-600)' }}>− {formatINR0(s.amount)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>bal {formatINR0(s.balanceAfter)}</span>
                    {s.done ? <Icon name="circleCheck" size={14} color="var(--green-600)" /> : <Icon name="clock" size={14} color="var(--text-subtle)" />}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Advances are recovered from salary per the schedule above; remaining balance carries to the next month.</div>
      </div>
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 800 : 600, fontFamily: 'var(--font-mono)', color: strong ? 'var(--coral-600)' : 'var(--text-strong)' }}>{value}</span>
    </div>
  );
}

import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, Input, Modal, Select, StatCard } from '../../components/ui';
import { SalarySlip } from '../../components/payroll/SalarySlip';
import { CONFIRMATION_META } from '../../components/payroll/statusMeta';
import { useAppStore } from '../../store/AppStore';
import { employeeBreakdown, employeeOutstandingAdvance, employeeTiffinTotal } from '../../lib/payroll';
import { formatINR, formatINR0 } from '../../services';
import { CURRENT_MONTH } from '../../data';
import type { Employee, LeaveType } from '../../types';
import logo from '../../assets/ganguram-logo.png';
import gauri from '../../assets/gauri-mascot.png';

const noticeTone: Record<string, CSSProperties> = {
  brand: { background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)' },
  info: { background: 'var(--blue-50)', border: '1px solid var(--blue-100)' },
  warning: { background: 'var(--amber-50)', border: '1px solid var(--amber-100)' },
};

export function PortalPage() {
  const navigate = useNavigate();
  const { employees, notices, updatePaymentStatus } = useAppStore();
  // The signed-in employee (sample): first login-enabled employee.
  const emp = employees.find((e) => e.login === 'enabled') ?? employees[0];
  const [slip, setSlip] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const b = employeeBreakdown(emp);
  const pending = emp.payments.filter((p) => p.status === 'pending');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }}>
      {/* Portal topbar */}
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 10 }}>
        <img src={logo} alt="Ganguram" style={{ height: 38 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Employee portal</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={emp.name} size={34} status="present" />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>{emp.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role} · {emp.branch}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" iconLeft={<Icon name="logout" size={15} />} onClick={() => navigate('/login')}>Sign out</Button>
      </header>

      <main className="gx-scroll" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Hero — welcome + salary (a permitted Gauri moment) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px 28px', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--indigo-600) 0%, var(--indigo-800) 100%)', color: '#fff', flexWrap: 'wrap' }}>
          <img src={gauri} alt="Gauri" style={{ height: 96, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Namaste</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginTop: 2 }}>{emp.name.split(' ')[0]}</h1>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>Here is your {CURRENT_MONTH.label} summary.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net payable</div>
            <div style={{ fontSize: 34, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{formatINR0(b.finalPayable)}</div>
            <Button variant="accent" size="sm" iconLeft={<Icon name="fileText" size={15} />} onClick={() => setSlip(true)} style={{ marginTop: 8 }}>View salary slip</Button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard label="Worked days" value={emp.worked} suffix={`/ ${CURRENT_MONTH.workingDays}`} icon="calendar" tone="brand" />
          <StatCard label="Free leave left" value={b.leaveUnused} suffix="/ 4" icon="circleCheck" tone="green" />
          <StatCard label="Tiffin (CTC)" value={formatINR0(employeeTiffinTotal(emp)).replace('₹', '')} prefix="₹" icon="utensils" tone="blue" />
          <StatCard label="Advance balance" value={formatINR0(employeeOutstandingAdvance(emp)).replace('₹', '')} prefix="₹" icon="banknote" tone="amber" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Pending confirmations */}
            <Card title="Pending payment confirmations" subtitle="Confirm what you have received" action={<Badge variant="pending">{pending.length}</Badge>}>
              {pending.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  <Icon name="circleCheck" size={18} color="var(--green-500)" /> All payments confirmed. Nothing pending.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pending.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                      <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="wallet" size={18} />
                      </span>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{p.type} · {p.period}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.date} · {p.method} {p.ref && p.ref !== '—' ? `· ${p.ref}` : ''}</div>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{formatINR(p.amount)}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="primary" size="sm" iconLeft={<Icon name="check" size={14} />} onClick={() => updatePaymentStatus(emp.id, p.id, 'confirmed')}>Confirm</Button>
                        <Button variant="secondary" size="sm" onClick={() => updatePaymentStatus(emp.id, p.id, 'disputed')}>Raise issue</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Payment receipts */}
            <Card title="Payment receipts" subtitle="Your salary, advance & tiffin history" padding="0">
              <div className="gx-scroll" style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-inset)' }}>
                      {['Type', 'Period', 'Amount', 'Status'].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 2 ? 'right' : 'left', padding: '11px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {emp.payments.map((p) => {
                      const meta = CONFIRMATION_META[p.status];
                      return (
                        <tr key={p.id}>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{p.type}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-muted)' }}>{p.period}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 13, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR(p.amount)}</td>
                          <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}><Badge variant={meta.variant} size="sm" dot>{meta.label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Leave status */}
            <Card title="Leave status" subtitle={`Free leave: ${b.leaveUnused} of 4 left`} action={<Button variant="tonal" size="sm" iconLeft={<Icon name="plus" size={14} />} onClick={() => setLeaveOpen(true)}>Request</Button>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {emp.leaves.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No leave requests yet.</div>}
                {emp.leaves.map((l) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <Icon name="calendar" size={16} color="var(--blue-600)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{l.dateLabel} · {l.days}d</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.type}</div>
                    </div>
                    {l.status === 'pending' ? (
                      <Badge variant="pending" size="sm" dot>Pending</Badge>
                    ) : l.status === 'rejected' ? (
                      <Badge variant="rejected" size="sm" dot>Rejected</Badge>
                    ) : (
                      <Badge variant={l.paid ? 'eligible' : 'deductible'} size="sm" dot>{l.paid ? 'Paid' : 'Unpaid'}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Company notices */}
            <Card title="Company notices">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notices.map((n) => (
                  <div key={n.id} style={{ padding: '11px 13px', borderRadius: 'var(--radius-md)', ...noticeTone[n.tone] }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.45 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 6 }}>{n.date}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {slip && <SalarySlip employee={emp} onClose={() => setSlip(false)} />}
      {leaveOpen && <LeaveRequestModal emp={emp} onClose={() => setLeaveOpen(false)} />}
    </div>
  );
}

function LeaveRequestModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { addLeaveRequest } = useAppStore();
  const [dateLabel, setDateLabel] = useState('');
  const [days, setDays] = useState('1');
  const [type, setType] = useState<LeaveType>('Casual');
  const [reason, setReason] = useState('');

  const submit = () => {
    addLeaveRequest(emp.id, {
      dateLabel: dateLabel || '—',
      days: Number(days) || 1,
      type,
      reason: reason || '—',
      status: 'pending',
    });
    onClose();
  };

  return (
    <Modal
      icon="calendar"
      title="Request leave"
      subtitle="Your manager will approve or reject"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full onClick={submit}>Submit request</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
          <Input label="Date(s)" value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="e.g. 18–19 Mar" icon="calendar" />
          <Input label="Days" mono value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <Select label="Leave type" value={type} onChange={(e) => setType(e.target.value as LeaveType)} options={['Casual', 'Sick', 'Earned', 'Other']} />
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--blue-700)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <Icon name="info" size={14} style={{ marginTop: 1 }} />
          The first 4 eligible leave days a month are paid; beyond that, leave is deductible.
        </div>
      </div>
    </Modal>
  );
}

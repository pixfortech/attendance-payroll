import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, Input, KV, Modal, Select, StatCard, type IconName } from '../../components/ui';
import { SalarySlip } from '../../components/payroll/SalarySlip';
import { NotificationBell } from '../../components/layout/NotificationBell';
import { CONFIRMATION_META, PROOF_META } from '../../components/payroll/statusMeta';
import { useAppStore } from '../../store/AppStore';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { employeeBreakdown, employeeAdvanceAdjustment, employeeAdvanceRemaining, employeeOutstandingAdvance, employeeTiffinTotal } from '../../lib/payroll';
import { PROOF_METHOD_LABEL } from '../../services/attendance';
import { formatINR, formatINR0, formatSignedINR } from '../../services';
import { CURRENT_MONTH } from '../../data';
import type { ConfirmationStatus, Employee, LeaveType } from '../../types';
import logo from '../../assets/ganguram-logo.png';
import gauri from '../../assets/gauri-mascot.png';

type Section = 'home' | 'attendance' | 'leave' | 'payments' | 'profile';
const SECTIONS: { id: Section; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'attendance', label: 'Attendance', icon: 'calendar' },
  { id: 'leave', label: 'Leave', icon: 'clock' },
  { id: 'payments', label: 'Payments', icon: 'wallet' },
  { id: 'profile', label: 'Profile', icon: 'user' },
];

const noticeTone: Record<string, CSSProperties> = {
  brand: { background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)' },
  info: { background: 'var(--blue-50)', border: '1px solid var(--blue-100)' },
  warning: { background: 'var(--amber-50)', border: '1px solid var(--amber-100)' },
};
const mono = { fontFamily: 'var(--font-mono)' as const };

export function PortalPage() {
  const navigate = useNavigate();
  const { employees, session, logout } = useAppStore();
  const isMobile = useIsMobile();
  const emp = employees.find((e) => e.id === session?.employeeId) ?? employees.find((e) => e.login === 'enabled') ?? employees[0];
  const [section, setSection] = useState<Section>('home');
  const [slip, setSlip] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const signOut = () => { logout(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)', paddingBottom: isMobile ? 76 : 0 }}>
      <header style={{ height: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 10 }}>
        <img src={logo} alt="Ganguram" style={{ height: 34 }} />
        {!isMobile && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Employee portal</span>}
        <div style={{ flex: 1 }} />
        <NotificationBell viewer={{ employeeId: emp.id }} />
        <Avatar name={emp.name} size={32} status="present" />
        {!isMobile && (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>{emp.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.role} · {emp.branch}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" iconLeft={<Icon name="logout" size={15} />} onClick={signOut}>{isMobile ? '' : 'Sign out'}</Button>
      </header>

      {!isMobile && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 24px 0', display: 'flex', gap: 6 }}>
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} style={pillStyle(section === s.id)}>
              <Icon name={s.icon} size={16} /> {s.label}
            </button>
          ))}
        </div>
      )}

      <main className="gx-scroll" style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 14px 24px' : '20px 24px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {section !== 'home' && isMobile && (
          <button onClick={() => setSection('home')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', padding: 0 }}>
            <Icon name="chevronLeft" size={16} /> Home
          </button>
        )}
        {section === 'home' && <HomeSection emp={emp} onSlip={() => setSlip(true)} onGoLeave={() => setSection('leave')} />}
        {section === 'attendance' && <AttendanceSection emp={emp} />}
        {section === 'leave' && <LeaveSection emp={emp} onRequest={() => setLeaveOpen(true)} />}
        {section === 'payments' && <PaymentsSection emp={emp} onSlip={() => setSlip(true)} />}
        {section === 'profile' && <ProfileSection emp={emp} onSignOut={signOut} />}
      </main>

      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', display: 'flex', zIndex: 40, boxShadow: '0 -2px 12px rgba(38,37,74,0.06)' }}>
          {SECTIONS.map((s) => {
            const on = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer', color: on ? 'var(--brand-primary)' : 'var(--text-muted)', minHeight: 44, fontFamily: 'var(--font-sans)' }}>
                <Icon name={s.icon} size={21} />
                <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 600 }}>{s.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {slip && <SalarySlip employee={emp} onClose={() => setSlip(false)} />}
      {leaveOpen && <LeaveRequestModal emp={emp} onClose={() => setLeaveOpen(false)} />}
    </div>
  );
}

function BreakdownRow({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'red' | 'green' }) {
  const color = tone === 'red' ? 'var(--coral-600)' : tone === 'green' ? 'var(--green-700)' : 'var(--text-strong)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, ...mono, color }}>{value}</span>
    </div>
  );
}

function HomeSection({ emp, onSlip, onGoLeave }: { emp: Employee; onSlip: () => void; onGoLeave: () => void }) {
  const { notices, updatePaymentStatus, requestSalary } = useAppStore();
  const b = employeeBreakdown(emp);
  const advAdj = employeeAdvanceAdjustment(emp);
  const pending = emp.payments.filter((p) => p.status === 'pending');
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 22px', borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--indigo-600) 0%, var(--indigo-800) 100%)', color: '#fff', flexWrap: 'wrap' }}>
        <img src={gauri} alt="Gauri" style={{ height: 84, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Namaste</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginTop: 2 }}>{emp.name.split(' ')[0]}</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>Your {CURRENT_MONTH.label} net payable (live)</p>
          <div style={{ fontSize: 30, fontWeight: 800, ...mono, marginTop: 2 }}>{formatINR0(b.netSalary)}</div>
          <Button variant="accent" size="sm" iconLeft={<Icon name="fileText" size={15} />} onClick={onSlip} style={{ marginTop: 10 }}>View salary slip</Button>
        </div>
      </div>

      <div className="gx-grid gx-grid-stats">
        <StatCard label="Worked days" value={emp.worked} suffix={`/ ${CURRENT_MONTH.workingDays}`} icon="calendar" tone="brand" />
        <StatCard label="Free leave left" value={b.leaveUnused} suffix="/ 4" icon="circleCheck" tone="green" />
        <StatCard label="Tiffin (CTC)" value={formatINR0(employeeTiffinTotal(emp)).replace('₹', '')} prefix="₹" icon="utensils" tone="blue" />
        <StatCard label="Advance balance" value={formatINR0(employeeAdvanceRemaining(emp)).replace('₹', '')} prefix="₹" icon="banknote" tone="amber" />
      </div>

      <Card title="This month — net payable" subtitle="Updates live as your attendance changes">
        <BreakdownRow label="Gross monthly salary" value={formatINR(emp.salary)} />
        <BreakdownRow label="Attendance" sub={`${emp.daysPresent} present · ${emp.daysAbsent} absent · ${emp.daysHalf} half`} value={`${emp.worked} d`} />
        <BreakdownRow label="Paid / free leave" sub={`${b.freeLeaveUsed} used · ${b.leaveUnused} left of 4`} value={`${emp.leaveUsed} taken`} />
        <BreakdownRow label="Leave deduction" sub={b.leaveDeduction > 0 ? `${b.deductibleDays} deductible day(s)` : 'Within free-leave limit'} value={b.leaveDeduction > 0 ? formatSignedINR(-b.leaveDeduction) : formatINR(0)} tone={b.leaveDeduction > 0 ? 'red' : undefined} />
        <BreakdownRow label="Tiffin / food allowance" sub="Company-paid CTC · paid separately, not in net" value={formatSignedINR(b.tiffinTotal)} tone="green" />
        {advAdj > 0 && <BreakdownRow label="Advance adjustment" sub={`Remaining advance ${formatINR0(employeeAdvanceRemaining(emp))}`} value={formatSignedINR(-advAdj)} tone="red" />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', marginTop: 12, background: 'var(--indigo-50)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net payable</span>
          <span style={{ fontSize: 22, fontWeight: 800, ...mono, color: 'var(--indigo-700)' }}>{formatINR(b.netSalary)}</span>
        </div>
        {emp.worked === 0 && (
          emp.salaryRequested ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12.5, color: 'var(--indigo-700)' }}>
              <Icon name="circleCheck" size={15} /> Salary request sent — awaiting admin review.
            </div>
          ) : (
            <Button variant="secondary" full iconLeft={<Icon name="wallet" size={16} />} onClick={() => requestSalary(emp.id)} style={{ marginTop: 12 }}>Request salary processing</Button>
          )
        )}
      </Card>

      <Card title="Pending payment confirmations" action={<Badge variant="pending">{pending.length}</Badge>}>
        {pending.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
            <Icon name="circleCheck" size={18} color="var(--green-500)" /> All payments confirmed.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="wallet" size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{p.type} · {p.period}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.date} · {p.method}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, ...mono }}>{formatINR(p.amount)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" size="sm" full iconLeft={<Icon name="check" size={14} />} onClick={() => updatePaymentStatus(emp.id, p.id, 'confirmed')}>Confirm</Button>
                  <Button variant="secondary" size="sm" full onClick={() => updatePaymentStatus(emp.id, p.id, 'disputed')}>Raise issue</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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

      <Button variant="tonal" full iconLeft={<Icon name="clock" size={16} />} onClick={onGoLeave}>Request leave</Button>
    </>
  );
}

function AttendanceSection({ emp }: { emp: Employee }) {
  const { checkins, attendanceMarks } = useAppStore();
  const myCheckins = checkins.filter((c) => c.employeeId === emp.id);
  const marks = attendanceMarks[emp.id] ?? [];
  const markColor = (m: string) => (m === 'P' ? 'var(--green-500)' : m === 'A' ? 'var(--coral-500)' : m === 'H' ? 'var(--amber-500)' : m === 'L' ? 'var(--blue-500)' : 'var(--neutral-300)');
  return (
    <>
      <div className="gx-grid gx-grid-stats">
        <StatCard label="Worked" value={emp.worked} suffix={`/ ${CURRENT_MONTH.workingDays}`} icon="calendar" tone="brand" />
        <StatCard label="Present" value={emp.daysPresent} icon="circleCheck" tone="green" />
        <StatCard label="Absent" value={emp.daysAbsent} icon="x" tone="coral" />
        <StatCard label="Leave used" value={emp.leaveUsed} icon="clock" tone="blue" />
      </div>
      <Card title={`${CURRENT_MONTH.label} attendance`} subtitle={emp.branch}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {marks.map((m, i) => (
            <span key={i} title={`Day ${i + 1}: ${m}`} style={{ width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', background: markColor(m) }}>{m === 'O' ? '·' : m}</span>
          ))}
          {marks.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No attendance recorded yet.</span>}
        </div>
      </Card>
      <Card title="Check-in / check-out logs" subtitle="Your recent punches">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myCheckins.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No check-in logs yet.</div>}
          {myCheckins.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <Icon name="qr" size={16} color="var(--indigo-600)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{c.date} · {c.time}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{PROOF_METHOD_LABEL[c.method]}</div>
              </div>
              <Badge variant={PROOF_META[c.strength].variant} size="sm" dot>{c.approved ? 'Approved' : 'Pending'}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function LeaveSection({ emp, onRequest }: { emp: Employee; onRequest: () => void }) {
  const b = employeeBreakdown(emp);
  const [status, setStatus] = useState('all');
  const leaves = emp.leaves.filter((l) => status === 'all' || l.status === status);
  return (
    <>
      <Card title="Free leave balance" subtitle="4 paid leaves per month for eligible staff">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 800, ...mono, color: b.leaveUnused > 0 ? 'var(--green-700)' : 'var(--coral-600)' }}>{b.leaveUnused}</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>of 4 left</span>
        </div>
        <Button variant="primary" full iconLeft={<Icon name="plus" size={16} />} onClick={onRequest} style={{ marginTop: 14 }}>Request leave</Button>
      </Card>
      <Card title="Leave history" action={<div style={{ width: 150 }}><Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'all', label: 'All statuses' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} /></div>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leaves.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No leave records.</div>}
          {leaves.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <Icon name="calendar" size={16} color="var(--blue-600)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{l.dateLabel} · {l.days}d</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.type} · {l.reason}</div>
              </div>
              {l.status === 'pending' ? <Badge variant="pending" size="sm" dot>Pending</Badge> : l.status === 'rejected' ? <Badge variant="rejected" size="sm" dot>Rejected</Badge> : <Badge variant={l.paid ? 'eligible' : 'deductible'} size="sm" dot>{l.paid ? 'Paid' : 'Unpaid'}</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function PaymentsSection({ emp, onSlip }: { emp: Employee; onSlip: () => void }) {
  const [status, setStatus] = useState<'all' | ConfirmationStatus>('all');
  const payments = emp.payments.filter((p) => status === 'all' || p.status === status);
  return (
    <>
      <Button variant="secondary" full iconLeft={<Icon name="fileText" size={16} />} onClick={onSlip}>View current salary slip</Button>
      <Card
        title="Payment receipts"
        subtitle="Salary, advance, tiffin & bonus"
        action={<div style={{ width: 160 }}><Select value={status} onChange={(e) => setStatus(e.target.value as 'all' | ConfirmationStatus)} options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'disputed', label: 'Disputed' }]} /></div>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {payments.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No payments for this filter.</div>}
          {payments.map((p) => {
            const m = CONFIRMATION_META[p.status];
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 13px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{p.type} · {p.period}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.date} · {p.method}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, ...mono, color: 'var(--text-strong)' }}>{formatINR(p.amount)}</div>
                  <Badge variant={m.variant} size="sm" dot>{m.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Advance history" subtitle={`Outstanding ${formatINR0(employeeOutstandingAdvance(emp))}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emp.advances.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No advances.</div>}
          {emp.advances.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <Icon name="banknote" size={16} color="var(--amber-600)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{formatINR0(a.amount)} · {a.date}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{a.note}{a.plan ? ` · ${formatINR0(a.plan.monthlyAmount)}/mo × ${a.plan.months}` : ''}</div>
              </div>
              {a.cleared ? <Badge variant="confirmed" size="sm" dot>Cleared</Badge> : <Badge variant="pending" size="sm" dot>Outstanding</Badge>}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Tiffin / food allowance" subtitle={`${CURRENT_MONTH.label}`}>
        <KV label="Tiffin days this month" value={String(emp.tiffinDays)} icon="calendar" />
        <KV label="Tiffin CTC payable" value={formatINR0(employeeTiffinTotal(emp))} mono icon="utensils" valueColor="var(--blue-600)" />
      </Card>
    </>
  );
}

function ProfileSection({ emp, onSignOut }: { emp: Employee; onSignOut: () => void }) {
  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={emp.name} size={56} status="present" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-strong)' }}>{emp.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{emp.role} · {emp.branch}</div>
          </div>
        </div>
      </Card>
      <Card title="My details">
        <KV label="Employee ID" value={emp.id} mono icon="user" />
        <KV label="Joining date" value={emp.joined} icon="calendar" />
        <KV label="Phone" value={emp.phone} icon="phone" />
        <KV label="Email" value={emp.email} icon="mail" />
        <KV label="Monthly salary" value={formatINR0(emp.salary)} mono icon="wallet" />
      </Card>
      <Button variant="secondary" full iconLeft={<Icon name="logout" size={16} />} onClick={onSignOut}>Sign out</Button>
    </>
  );
}

function LeaveRequestModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { addLeaveRequest } = useAppStore();
  const [dateLabel, setDateLabel] = useState('');
  const [days, setDays] = useState('1');
  const [type, setType] = useState<LeaveType>('Casual');
  const [reason, setReason] = useState('');

  const submit = () => {
    addLeaveRequest(emp.id, { dateLabel: dateLabel || '—', days: Number(days) || 1, type, reason: reason || '—', status: 'pending' });
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

function pillStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '9px 16px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid',
    borderColor: active ? 'var(--brand-primary)' : 'var(--border-subtle)',
    background: active ? 'var(--brand-primary)' : 'var(--surface-card)',
    color: active ? '#fff' : 'var(--text-body)',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  };
}

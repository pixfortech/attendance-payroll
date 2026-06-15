import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, StatCard, type IconName } from '../../components/ui';
import { BulkAttendanceModal } from '../../components/payroll/BulkAttendanceModal';
import { NotificationBell } from '../../components/layout/NotificationBell';
import { PROOF_META } from '../../components/payroll/statusMeta';
import { useAppStore } from '../../store/AppStore';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { PROOF_METHOD_LABEL } from '../../services/attendance';
import { CURRENT_MONTH } from '../../data';
import { MARK_CYCLE, workedFromMarks, type Mark } from '../../data/attendanceMarks';
import logo from '../../assets/ganguram-logo.png';

type Section = 'overview' | 'attendance' | 'leave' | 'proof';
const SECTIONS: { id: Section; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'attendance', label: 'Attendance', icon: 'calendar' },
  { id: 'leave', label: 'Leave', icon: 'clock' },
  { id: 'proof', label: 'Proof', icon: 'shield' },
];

const MARKCOL: Record<Mark, { bg: string; fg: string; bd: string }> = {
  P: { bg: 'var(--green-50)', fg: 'var(--green-700)', bd: 'var(--green-100)' },
  A: { bg: 'var(--coral-50)', fg: 'var(--coral-700)', bd: 'var(--coral-100)' },
  H: { bg: 'var(--amber-50)', fg: 'var(--amber-700)', bd: 'var(--amber-100)' },
  L: { bg: 'var(--blue-50)', fg: 'var(--blue-700)', bd: 'var(--blue-100)' },
  O: { bg: 'var(--neutral-100)', fg: 'var(--neutral-400)', bd: 'var(--neutral-200)' },
};
const next = (m: Mark): Mark => MARK_CYCLE[(MARK_CYCLE.indexOf(m) + 1) % MARK_CYCLE.length];

export function ManagerPortal() {
  const navigate = useNavigate();
  const { session, branches, employees, checkins, attendanceMarks, setAttendanceMark, setLeaveStatus, approveCheckin, logout } = useAppStore();
  const isMobile = useIsMobile();
  const branch = session?.branch ?? branches[0]?.name ?? '';
  const signOut = () => { logout(); navigate('/login'); };
  const [section, setSection] = useState<Section>('overview');
  const [bulkOpen, setBulkOpen] = useState(false);

  const staff = employees.filter((e) => e.branch === branch);
  const branchInfo = branches.find((b) => b.name === branch);
  const pendingLeaves = staff.flatMap((e) => e.leaves.filter((l) => l.status === 'pending').map((l) => ({ ...l, emp: e })));
  const branchCheckins = checkins.filter((c) => c.branch === branch);
  const pendingProof = branchCheckins.filter((c) => !c.approved);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)', paddingBottom: isMobile ? 76 : 0 }}>
      <header style={{ height: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 10 }}>
        <img src={logo} alt="Ganguram" style={{ height: 34 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{isMobile ? 'Manager' : 'Manager portal'}</span>
        <div style={{ flex: 1 }} />
        <Badge variant="brand" icon="mapPin">{branch}</Badge>
        <NotificationBell viewer={{ role: 'manager' }} />
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
        {section === 'overview' && (
          <>
            <div className="gx-grid gx-grid-stats">
              <StatCard label="Branch staff" value={staff.length} icon="users" tone="brand" />
              <StatCard label="Present today" value={branchInfo?.presentToday ?? 0} suffix={`/ ${branchInfo?.staffCount ?? staff.length}`} icon="circleCheck" tone="green" />
              <StatCard label="Leave to review" value={pendingLeaves.length} icon="clock" tone="amber" onClick={() => setSection('leave')} />
              <StatCard label="Proof to approve" value={pendingProof.length} icon="shield" tone="coral" onClick={() => setSection('proof')} />
            </div>
            <Card title="Branch staff" subtitle={branch}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {staff.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <Avatar name={e.name} size={36} status={e.status === 'active' ? 'present' : 'off'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{e.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{e.role} · {e.worked} d worked</div>
                    </div>
                    {e.status === 'active' ? <Badge variant="present" size="sm" dot>Active</Badge> : <Badge variant="locked" size="sm" dot>Resigned</Badge>}
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--text-muted)', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <Icon name="shield" size={15} color="var(--indigo-500)" style={{ marginTop: 1 }} />
              Managers can mark attendance and approve leave/proof for {branch}. Salary changes require admin access.
            </div>
          </>
        )}

        {section === 'attendance' && (
          <Card
            title={`Attendance — ${branch}`}
            subtitle={`${CURRENT_MONTH.label} · tap a day to change`}
            action={<Button variant="tonal" size="sm" iconLeft={<Icon name="users" size={15} />} onClick={() => setBulkOpen(true)}>Bulk mark</Button>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {staff.map((e) => {
                const days = attendanceMarks[e.id] ?? Array.from({ length: CURRENT_MONTH.workingDays }, () => 'O' as Mark);
                return (
                  <div key={e.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Avatar name={e.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{e.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{e.role}</div>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{workedFromMarks(days)} d</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {days.map((d, i) => {
                        const c = MARKCOL[d];
                        return (
                          <button key={i} type="button" onClick={() => setAttendanceMark(e.id, i, next(d))} title={`Day ${i + 1}`} style={{ width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 700, background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}>
                            {d === 'O' ? '·' : d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {section === 'leave' && (
          <Card title="Leave requests" subtitle={`Pending across ${branch}`} action={<Badge variant="pending">{pendingLeaves.length}</Badge>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingLeaves.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No leave requests to review.</div>}
              {pendingLeaves.map((l) => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                  <Avatar name={l.emp.name} size={34} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{l.emp.name} · {l.dateLabel}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.days} day{l.days > 1 ? 's' : ''} · {l.type} · {l.reason}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" size="sm" iconLeft={<Icon name="check" size={14} />} onClick={() => setLeaveStatus(l.emp.id, l.id, 'approved')}>Approve</Button>
                    <Button variant="secondary" size="sm" onClick={() => setLeaveStatus(l.emp.id, l.id, 'rejected')}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {section === 'proof' && (
          <Card title="Attendance proof" subtitle={`Check-ins at ${branch}`} action={<Badge variant="pending">{pendingProof.length}</Badge>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {branchCheckins.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No check-ins recorded for this branch yet.</div>}
              {branchCheckins.map((c) => {
                const proof = PROOF_META[c.strength];
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                    <Avatar name={c.employeeName} size={34} status="present" />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{c.employeeName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{PROOF_METHOD_LABEL[c.method]} · {c.time}</div>
                    </div>
                    <Badge variant={proof.variant} dot>{proof.label}</Badge>
                    {!c.approved && <Button variant="primary" size="sm" iconLeft={<Icon name="check" size={14} />} onClick={() => approveCheckin(c.id)}>Approve</Button>}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
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

      {bulkOpen && <BulkAttendanceModal branchLocked={branch} onClose={() => setBulkOpen(false)} />}
    </div>
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

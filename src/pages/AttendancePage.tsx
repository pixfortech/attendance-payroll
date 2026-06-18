import { useState } from 'react';
import { Avatar, BackButton, Badge, Button, Card, Icon, Select, Tabs } from '../components/ui';
import { BulkAttendanceModal } from '../components/payroll/BulkAttendanceModal';
import { useAppStore } from '../store/AppStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import { isActiveEmployee } from '../lib/payroll';
import { branchFilterOptions, branchNameForFilter, employeeInBranch } from '../lib/branches';
import { downloadCsv } from '../lib/download';
import { CURRENT_MONTH } from '../data';
import { MARK_CYCLE, workedFromMarks, countMark, type Mark } from '../data/attendanceMarks';
import type { AttendanceRecord, VerificationStatus } from '../types';
import type { IconName } from '../components/ui';

/** Verification status of a check-in (derives a sensible value for legacy records). */
const vStatus = (c: AttendanceRecord): VerificationStatus => c.verificationStatus ?? (c.approved ? 'verified' : 'needs_review');

const MARK: Record<Mark, { bg: string; fg: string; bd: string; label: string }> = {
  P: { bg: 'var(--green-50)', fg: 'var(--green-700)', bd: 'var(--green-100)', label: 'Present' },
  A: { bg: 'var(--coral-50)', fg: 'var(--coral-700)', bd: 'var(--coral-100)', label: 'Absent' },
  H: { bg: 'var(--amber-50)', fg: 'var(--amber-700)', bd: 'var(--amber-100)', label: 'Half-day' },
  L: { bg: 'var(--blue-50)', fg: 'var(--blue-700)', bd: 'var(--blue-100)', label: 'Paid leave' },
  O: { bg: 'var(--neutral-100)', fg: 'var(--neutral-400)', bd: 'var(--neutral-200)', label: 'Week-off' },
};
const DAYS = CURRENT_MONTH.workingDays;
const nextMark = (m: Mark): Mark => MARK_CYCLE[(MARK_CYCLE.indexOf(m) + 1) % MARK_CYCLE.length];

const METHODS: { icon: IconName; name: string; desc: string; status: string; tone: 'paid' | 'pending' | 'neutral' }[] = [
  { icon: 'qr', name: 'QR attendance', desc: 'Branch QR scan check-in', status: 'Live', tone: 'paid' },
  { icon: 'mapPin', name: 'GPS + selfie', desc: 'Geo-fenced selfie punch', status: 'Beta', tone: 'pending' },
  { icon: 'fingerprint', name: 'Biometric', desc: 'Device fingerprint sync', status: 'Planned', tone: 'neutral' },
  { icon: 'refresh', name: 'Offline sync', desc: 'Queue punches, sync later', status: 'Planned', tone: 'neutral' },
  { icon: 'badgeCheck', name: 'Manager approval', desc: 'Branch manager sign-off', status: 'Live', tone: 'paid' },
];

export function AttendancePage() {
  const { employees, branches, checkins, attendanceMarks, setAttendanceMark, bulkMarkDays, pendingSync, online, syncPendingAttendance, approveCheckin, rejectCheckin, reviewCheckinHalf } = useAppStore();
  const isMobile = useIsMobile();
  const [view, setView] = useState('grid');
  const [branch, setBranch] = useState(''); // '' = All branches
  const [bulkOpen, setBulkOpen] = useState(false);

  const branchName = branchNameForFilter(branch, branches);
  const gridStaff = employees
    .filter((e) => isActiveEmployee(e) && employeeInBranch(e, branch, branches))
    .map((e) => ({ id: e.id, name: e.name, role: e.role, branch: e.branch, days: attendanceMarks[e.id] ?? Array.from({ length: DAYS }, () => 'O' as Mark) }));

  const reviewCount = checkins.filter((c) => vStatus(c) === 'needs_review').length;
  const cycle = (empId: string, dayIndex: number, current: Mark) => setAttendanceMark(empId, dayIndex, nextMark(current));
  const reviewActions = { onApprove: approveCheckin, onReject: rejectCheckin, onHalf: reviewCheckinHalf };
  // Quick "today" bulk marking for the currently-shown staff.
  const todayIdx = Math.min(DAYS - 1, Math.max(0, new Date().getDate() - 1));
  const gridIds = gridStaff.map((s) => s.id);
  const markToday = (m: Mark) => { if (gridIds.length) bulkMarkDays(gridIds, [todayIdx], m); };

  const exportGrid = () =>
    downloadCsv(`attendance-${branch || 'all'}-${CURRENT_MONTH.short}.csv`, [
      ['Employee', 'Role', 'Source', ...Array.from({ length: DAYS }, (_, i) => String(i + 1)), 'Worked'],
      ...gridStaff.map((s) => [s.name, s.role, 'manual', ...s.days, workedFromMarks(s.days)]),
    ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {isMobile && <BackButton to="/" label="Dashboard" />}
      <SyncBar online={online} pending={pendingSync.length} onSync={() => void syncPendingAttendance()} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          variant="pill"
          value={view}
          onChange={setView}
          items={[
            { id: 'grid', label: 'Month grid', icon: 'calendar' },
            { id: 'proof', label: 'Review', icon: 'shield', count: reviewCount || undefined },
            { id: 'methods', label: 'Capture', icon: 'qr' },
          ]}
        />
        <div style={{ flex: 1 }} />
        {view === 'grid' && (
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={branchFilterOptions(branches)} />
          </div>
        )}
        {view === 'grid' && <Button variant="tonal" iconLeft={<Icon name="users" size={16} />} onClick={() => setBulkOpen(true)}>Bulk mark</Button>}
        {view === 'grid' && <Button variant="secondary" iconLeft={<Icon name="download" size={16} />} onClick={exportGrid}>Export</Button>}
      </div>

      {view === 'grid' && gridStaff.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Quick (today):</span>
          <Button variant="secondary" size="sm" onClick={() => markToday('P')}>All present</Button>
          <Button variant="secondary" size="sm" onClick={() => markToday('A')}>All absent</Button>
          <Button variant="secondary" size="sm" onClick={() => markToday('H')}>All half-day</Button>
        </div>
      )}
      {view === 'grid' && (isMobile ? <MonthGridMobile staff={gridStaff} branch={branchName} showBranch={!branch} onCycle={cycle} /> : <MonthGridDesktop staff={gridStaff} branch={branchName} showBranch={!branch} onCycle={cycle} />)}
      {view === 'proof' && <ProofView checkins={checkins} actions={reviewActions} />}
      {view === 'methods' && <MethodsView branch={branchName} />}

      {bulkOpen && <BulkAttendanceModal branchLocked={branch ? branchName : undefined} onClose={() => setBulkOpen(false)} />}
    </div>
  );
}

function SyncBar({ online, pending, onSync }: { online: boolean; pending: number; onSync: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: online ? 'var(--green-700)' : 'var(--coral-700)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? 'var(--green-500)' : 'var(--coral-500)' }} />
        {online ? 'Online' : 'Offline'}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--text-subtle)' }}>·</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-body)' }} data-testid="pending-sync-count">{pending} pending sync</span>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" size="sm" iconLeft={<Icon name="refresh" size={14} />} disabled={pending === 0} onClick={onSync}>Sync now</Button>
    </div>
  );
}

type Staff = { id: string; name: string; role: string; branch: string; days: Mark[] };
type CycleFn = (empId: string, dayIndex: number, current: Mark) => void;

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {(['P', 'A', 'H', 'L', 'O'] as Mark[]).map((k) => (
        <Badge key={k} variant={k === 'P' ? 'paid' : k === 'A' ? 'absent' : k === 'H' ? 'half' : k === 'L' ? 'leave' : 'neutral'} size="sm" dot>
          {MARK[k].label}
        </Badge>
      ))}
    </div>
  );
}

function MarkCell({ mark, onClick, size = 22 }: { mark: Mark; onClick: () => void; size?: number }) {
  const m = MARK[mark];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${m.label} — tap to change`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: m.bg, color: m.fg, border: `1px solid ${m.bd}`, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)' }}
    >
      {mark === 'O' ? '·' : mark}
    </button>
  );
}

function MonthGridDesktop({ staff, branch, showBranch, onCycle }: { staff: Staff[]; branch: string; showBranch?: boolean; onCycle: CycleFn }) {
  return (
    <Card padding="0">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>Attendance — {CURRENT_MONTH.label}</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{branch} · {staff.length} staff · {DAYS} working days · tap a cell to change mark</p>
        </div>
        <Legend />
      </div>
      {staff.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No active staff in {branch}.</div>
      ) : (
      <div className="gx-scroll" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 920 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface-card)', textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.04em', textTransform: 'uppercase', zIndex: 2, borderBottom: '1px solid var(--border-subtle)', minWidth: 200 }}>Employee</th>
              {Array.from({ length: DAYS }, (_, i) => (
                <th key={i} style={{ padding: '10px 0', fontSize: 10.5, fontWeight: 700, color: 'var(--text-subtle)', textAlign: 'center', width: 26, borderBottom: '1px solid var(--border-subtle)' }}>{i + 1}</th>
              ))}
              <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)', minWidth: 90 }}>Worked</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td style={{ position: 'sticky', left: 0, background: 'var(--surface-card)', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={s.name} size={32} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{showBranch ? `${s.role} · ${s.branch}` : s.role}</div>
                    </div>
                  </div>
                </td>
                {s.days.map((d, i) => (
                  <td key={i} style={{ textAlign: 'center', padding: '4px 2px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <MarkCell mark={d} onClick={() => onCycle(s.id, i, d)} />
                  </td>
                ))}
                <td style={{ textAlign: 'right', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{workedFromMarks(s.days)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> d</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </Card>
  );
}

function MonthGridMobile({ staff, branch, showBranch, onCycle }: { staff: Staff[]; branch: string; showBranch?: boolean; onCycle: CycleFn }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card bodyStyle={{ padding: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>Attendance — {CURRENT_MONTH.label}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{branch} · {staff.length} staff · tap a day to change mark</p>
          </div>
          <Legend />
        </div>
      </Card>
      {staff.length === 0 && <Card bodyStyle={{ padding: 18 }}><div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>No active staff in {branch}.</div></Card>}
      {staff.map((s) => (
        <Card key={s.id} bodyStyle={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Avatar name={s.name} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{s.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{showBranch ? `${s.role} · ${s.branch}` : s.role}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{workedFromMarks(s.days)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> d</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--green-700)', fontWeight: 600 }}>{countMark(s.days, 'P')} present</span>
            <span style={{ color: 'var(--blue-700)', fontWeight: 600 }}>{countMark(s.days, 'L')} leave</span>
            <span style={{ color: 'var(--coral-700)', fontWeight: 600 }}>{countMark(s.days, 'A')} absent</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {s.days.map((d, i) => (
              <MarkCell key={i} mark={d} onClick={() => onCycle(s.id, i, d)} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Factor({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: ok ? 'var(--green-50)' : 'var(--neutral-100)', color: ok ? 'var(--green-700)' : 'var(--text-subtle)', border: `1px solid ${ok ? 'var(--green-100)' : 'var(--border-subtle)'}` }}>
      <Icon name={ok ? 'check' : 'x'} size={11} />
      {label}
    </span>
  );
}

const VERIFY_META: Record<NonNullable<AttendanceRecord['verificationStatus']>, { label: string; variant: 'paid' | 'pending' | 'rejected' }> = {
  verified: { label: 'Verified', variant: 'paid' },
  needs_review: { label: 'Needs review', variant: 'pending' },
  rejected: { label: 'Rejected', variant: 'rejected' },
};
const PROOF_BADGE: Record<string, { label: string; variant: 'paid' | 'pending' | 'neutral' }> = {
  uploaded: { label: 'Proof submitted', variant: 'paid' },
  needs_review: { label: 'Proof needs review', variant: 'pending' },
  missing: { label: 'Proof missing', variant: 'pending' },
  not_required: { label: 'Proof not required', variant: 'neutral' },
};

interface ReviewActions {
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onHalf: (id: string) => void;
}

function ProofView({ checkins, actions }: { checkins: AttendanceRecord[]; actions: ReviewActions }) {
  const review = checkins.filter((c) => vStatus(c) === 'needs_review');
  const decided = checkins.filter((c) => vStatus(c) !== 'needs_review');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Review queue" subtitle="QR mismatch · outside geofence · GPS missing · kiosk uncertain" action={<Badge variant="pending">{review.length}</Badge>}>
        {review.length === 0 ? (
          <div style={{ padding: 14, fontSize: 13, color: 'var(--text-muted)' }}>Nothing to review right now.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {review.map((c) => (
              <ReviewRow key={c.id} c={c} actions={actions} />
            ))}
          </div>
        )}
      </Card>
      <Card title="Recent check-ins" subtitle="Verified &amp; rejected">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {decided.length === 0 ? (
            <div style={{ padding: 8, fontSize: 13, color: 'var(--text-muted)' }}>No check-ins recorded yet.</div>
          ) : (
            decided.slice(0, 20).map((c) => <ReviewRow key={c.id} c={c} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function ReviewRow({ c, actions }: { c: AttendanceRecord; actions?: ReviewActions }) {
  const status = vStatus(c);
  const meta = VERIFY_META[status];
  const proof = c.proof ? PROOF_BADGE[c.proof.proofStatus] : null;
  const source = (c.source ?? c.method).toUpperCase();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
        <Avatar name={c.employeeName} size={36} />
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{c.employeeName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.branch} · {source} · {c.time}</div>
        </div>
        <Badge variant={meta.variant} dot>{meta.label}</Badge>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {proof && <Badge variant={proof.variant === 'neutral' ? 'neutral' : proof.variant} size="sm">{proof.label}</Badge>}
        {typeof c.distanceMetres === 'number' && <Factor ok={status === 'verified'} label={`~${c.distanceMetres}m`} />}
      </div>
      {c.reason && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12, color: 'var(--amber-700)' }}>
          <Icon name="info" size={13} style={{ marginTop: 1 }} /> {c.reason}
        </div>
      )}
      {actions && status === 'needs_review' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" iconLeft={<Icon name="check" size={14} />} onClick={() => actions.onApprove(c.id)}>Approve</Button>
          <Button variant="secondary" size="sm" onClick={() => actions.onHalf(c.id)}>Half day</Button>
          <Button variant="ghost" size="sm" iconLeft={<Icon name="x" size={14} />} onClick={() => actions.onReject(c.id, 'Rejected by reviewer')}>Reject</Button>
        </div>
      )}
    </div>
  );
}

function MethodsView({ branch }: { branch: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
      <Card title="Attendance capture" subtitle="Intelligent, future-ready methods" action={<Badge variant="brand" icon="sparkles">Roadmap</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {METHODS.map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon} size={21} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{m.desc}</div>
              </div>
              <Badge variant={m.tone} dot>{m.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Branch kiosk" subtitle="For staff without smartphones">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          One branch device can mark attendance for {branch}. Staff pick their name or enter an Employee ID / PIN, with optional selfie and manager confirmation.
        </p>
        <Button variant="primary" full iconLeft={<Icon name="qr" size={16} />} onClick={() => window.open('/kiosk', '_blank')} style={{ marginTop: 14 }}>
          Open kiosk mode
        </Button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', marginTop: 12 }}>
          <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
          Proof method is saved as kiosk/manual/selfie and held for approval if weak.
        </div>
      </Card>
    </div>
  );
}

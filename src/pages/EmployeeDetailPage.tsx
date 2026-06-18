import { useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  BackButton,
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  Input,
  KV,
  Modal,
  ProgressBar,
  ResponsiveTable,
  SectionLabel,
  Select,
  Switch,
  Tabs,
  UploadZone,
  useConfirm,
  useToast,
  type Column,
  type TabItem,
} from '../components/ui';
import { RecordAdvanceModal } from '../components/payroll/RecordAdvanceModal';
import { AdvanceAdjustModal } from '../components/payroll/AdvanceAdjustModal';
import { AdvanceDetailModal } from '../components/payroll/AdvanceDetailModal';
import { RecordPaymentModal } from '../components/payroll/RecordPaymentModal';
import { EmployeeFormModal } from '../components/payroll/EmployeeFormModal';
import { CONFIRMATION_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import type { DocumentKind, PortalRole, TiffinLabel } from '../types';
import { employeeBreakdown, employeeDaysWorked, employeeOutstandingAdvance, employeeTenureMonths, employeeTiffinPerDay, employeeTiffinTotal } from '../lib/payroll';
import { isAccountLocked, managerNeedsBranch, portalAccessOf, PORTAL_STATUS_META } from '../lib/portalAccess';
import { validatePin } from '../lib/pinAuth';
import { activeBranches } from '../lib/branches';
import { formatDMY, isFutureISO, todayISO } from '../lib/dates';
import { evaluateEligibility, formatINR, formatINR0 } from '../services';
import { CURRENT_MONTH } from '../data';
import type { Employee } from '../types';

const BASIS_LABEL: Record<Employee['basis'], string> = { fixed30: 'Fixed 30-day', calendar: 'Actual calendar-day' };

export function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEmployee, setEmployeeStatus, archiveEmployee, deleteEmployee } = useAppStore();
  const confirm = useConfirm();
  const emp = id ? getEmployee(id) : undefined;
  const [tab, setTab] = useState('profile');
  const [advOpen, setAdvOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);

  const toggleStatus = () => {
    if (!emp) return;
    if (emp.status === 'active') setResignOpen(true);
    else setEmployeeStatus(emp.id, 'active');
  };

  const toggleArchive = async () => {
    if (!emp) return;
    if (emp.archived) return archiveEmployee(emp.id, false);
    const ok = await confirm({ title: 'Archive employee?', message: `${emp.name} will be hidden from active lists and dashboard counts. You can restore them later.`, confirmLabel: 'Archive', tone: 'primary', icon: 'lock' });
    if (ok) archiveEmployee(emp.id, true);
  };

  const removeEmployee = async () => {
    if (!emp) return;
    const ok = await confirm({ title: 'Delete employee permanently?', message: `${emp.name} (${emp.id}) and their record will be permanently deleted from the database. This cannot be undone — consider Archive instead.`, confirmLabel: 'Delete permanently', tone: 'danger', icon: 'trash' });
    if (ok) {
      deleteEmployee(emp.id);
      navigate('/employees');
    }
  };

  if (!emp) {
    return (
      <Card>
        <p style={{ color: 'var(--text-muted)' }}>Employee not found.</p>
        <Button variant="secondary" onClick={() => navigate('/employees')} style={{ marginTop: 12 }}>
          Back to Employee Master
        </Button>
      </Card>
    );
  }

  const eligible = employeeBreakdown(emp).eligible;
  const tabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'salary', label: 'Salary & Leave', icon: 'wallet' },
    { id: 'advance', label: 'Advance', icon: 'banknote', count: emp.advances.filter((a) => !a.cleared).length || undefined },
    { id: 'payments', label: 'Payments', icon: 'history' },
    { id: 'tiffin', label: 'Tiffin', icon: 'utensils' },
    { id: 'documents', label: 'Documents', icon: 'fileText' },
    { id: 'login', label: 'Login access', icon: emp.login === 'enabled' ? 'unlock' : 'lock' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <BackButton to="/employees" label="Employee Master" />

      <Card padding="0">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 22, flexWrap: 'wrap' }}>
          <Avatar name={emp.name} size={64} status={emp.status === 'active' ? 'present' : 'off'} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.02em' }}>{emp.name}</h2>
              {emp.status === 'active' ? <Badge variant="present" dot>Active</Badge> : <Badge variant="locked" dot>Resigned</Badge>}
              {emp.archived && <Badge variant="locked" icon="lock">Archived</Badge>}
              {eligible ? <Badge variant="eligible" icon="circleCheck">Leave eligible</Badge> : <Badge variant="noteligible" icon="info">Not eligible</Badge>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{emp.id}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="mapPin" size={13} />{emp.branch}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="briefcase" size={13} />{emp.role}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="phone" size={13} />{emp.phone}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" iconLeft={<Icon name={emp.status === 'active' ? 'logout' : 'circleCheck'} size={15} />} onClick={toggleStatus}>
              {emp.status === 'active' ? 'Mark resigned' : 'Mark active'}
            </Button>
            <Button variant="ghost" iconLeft={<Icon name={emp.archived ? 'circleCheck' : 'lock'} size={15} />} onClick={toggleArchive}>{emp.archived ? 'Restore' : 'Archive'}</Button>
            <IconButton icon="trash" label="Delete employee" variant="ghost" onClick={removeEmployee} />
            <Button variant="secondary" iconLeft={<Icon name="pencil" size={15} />} onClick={() => setEditOpen(true)}>Edit</Button>
            <Button variant="primary" iconLeft={<Icon name="wallet" size={16} />} onClick={() => setPayOpen(true)}>Record payment</Button>
          </div>
        </div>
        <div style={{ padding: '0 22px' }}>
          <Tabs value={tab} onChange={setTab} items={tabs} />
        </div>
      </Card>

      {tab === 'profile' && <ProfilePanel emp={emp} />}
      {tab === 'salary' && <SalaryLeavePanel emp={emp} />}
      {tab === 'advance' && <AdvancePanel emp={emp} onAdd={() => setAdvOpen(true)} />}
      {tab === 'payments' && <PaymentsPanel emp={emp} onAdd={() => setPayOpen(true)} />}
      {tab === 'tiffin' && <TiffinPanel emp={emp} />}
      {tab === 'documents' && <DocumentsPanel emp={emp} />}
      {tab === 'login' && <LoginPanel emp={emp} />}

      {advOpen && <AdvanceModalConnected emp={emp} onClose={() => setAdvOpen(false)} />}
      {payOpen && <PaymentModalConnected emp={emp} onClose={() => setPayOpen(false)} />}
      {editOpen && <EmployeeFormModal employee={emp} onClose={() => setEditOpen(false)} />}
      {resignOpen && <ResignModal emp={emp} onClose={() => setResignOpen(false)} onConfirm={(dateISO) => { setEmployeeStatus(emp.id, 'resigned', dateISO); setResignOpen(false); }} />}
    </div>
  );
}

/* ---------- Mark resigned (date picker, blocks future) ---------- */
function ResignModal({ emp, onClose, onConfirm }: { emp: Employee; onClose: () => void; onConfirm: (dateISO: string) => void }) {
  const [date, setDate] = useState(todayISO());
  const future = isFutureISO(date);
  const valid = !!date && !future;
  return (
    <Modal
      icon="logout"
      title="Mark as resigned"
      subtitle={`${emp.name} · ${emp.id}`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={!valid} onClick={() => onConfirm(date)}>Mark resigned</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Resignation / ending date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        {future && <div style={{ fontSize: 12, color: 'var(--coral-700)', background: 'var(--coral-50)', border: '1px solid var(--coral-100)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>Future resignation dates are not allowed.</div>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', lineHeight: 1.5 }}>
          {emp.name} will be marked resigned effective this date. Days-worked stops here, free-leave eligibility uses resignation-month logic, and portal access can be disabled from Login access.
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Profile ---------- */
function ProfilePanel({ emp }: { emp: Employee }) {
  const b = employeeBreakdown(emp);
  const tenure = employeeTenureMonths(emp);
  const daysWorked = employeeDaysWorked(emp);
  const conds = evaluateEligibility({ tenureMonths: tenure, workedDays: emp.worked, status: emp.status }).conditions;
  const tenureLabel = tenure >= 12 ? `${Math.floor(tenure / 12)}y ${tenure % 12}m` : `${tenure} months`;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start' }}>
      <Card title="Employment details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
          <KV label="Branch" value={emp.branch} icon="mapPin" />
          <KV label="Role" value={emp.role} icon="briefcase" />
          <KV label="Joining date" value={formatDMY(emp.joined)} icon="calendar" />
          <KV label={emp.status === 'resigned' ? 'Ending / resigned date' : 'Ending date'} value={emp.status === 'resigned' ? formatDMY(emp.resignedAt) : 'Active'} icon="calendar" valueColor={emp.status === 'resigned' ? 'var(--coral-600)' : undefined} />
          <KV label="Tenure" value={tenureLabel} icon="clock" />
          <KV label="Days worked in company" value={`${daysWorked} days`} mono icon="history" />
          <KV label="Monthly salary" value={emp.salaryMissing ? 'Missing — set before payroll' : formatINR0(emp.salary)} mono icon="wallet" valueColor={emp.salaryMissing ? 'var(--amber-700)' : undefined} />
          <KV label="Salary basis" value={BASIS_LABEL[emp.basis]} icon="calculator" />
          <KV label="Daily salary" value={formatINR(b.daily)} mono icon="rupee" />
          <KV label="Employee ID" value={emp.id} mono icon="user" />
          <KV label="Phone" value={emp.phone} icon="phone" />
          <KV label="Email" value={emp.email} icon="mail" />
        </div>
      </Card>
      <Card title="Leave eligibility" subtitle="All three conditions must pass">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conds.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', background: c.passed ? 'var(--green-50)' : 'var(--coral-50)', border: `1px solid ${c.passed ? 'var(--green-100)' : 'var(--coral-100)'}`, borderRadius: 'var(--radius-md)' }}>
              <Icon name={c.passed ? 'circleCheck' : 'x'} size={18} color={c.passed ? 'var(--green-600)' : 'var(--coral-600)'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{c.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.detail}</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, padding: '12px 14px', background: b.eligible ? 'var(--indigo-50)' : 'var(--neutral-100)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>4 free paid leaves / month</span>
            {b.eligible ? <Badge variant="eligible" dot>Eligible</Badge> : <Badge variant="noteligible" dot>Not eligible</Badge>}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Set / reset PIN (no plain PIN stored) ---------- */
function SetPinModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { updatePortalAccess } = useAppStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const v = validatePin(pin); // 4/6 digits, blocks weak PINs
    if (!v.ok) return setError(v.message ?? 'Invalid PIN.');
    if (pin !== confirmPin) return setError('PINs do not match.');
    // TODO(backend): call Cloud Function setEmployeePin(employeeId, pin) which
    // salts + hashes the PIN server-side and stores only hash/salt metadata.
    // verifyPinLogin then verifies server-side and issues a Firebase custom
    // token. The plain PIN is NEVER stored on the client or in Firestore — here
    // we only flip the pinSet metadata so demo login keeps working.
    updatePortalAccess(emp.id, { pinSet: true, failedAttempts: 0, lockedUntil: null }, { action: 'PIN set', notify: { title: 'PIN set', message: 'Your portal PIN was set by an admin.' } });
    onClose();
  };

  return (
    <Modal
      icon="lock"
      title={emp.portalAccess?.pinSet ? 'Reset PIN' : 'Set PIN'}
      subtitle={`${emp.name} · ${emp.id}`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full onClick={submit}>Save PIN</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="New PIN (4 or 6 digits)" type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setError(null); }} icon="lock" placeholder="••••" />
        <Input label="Confirm PIN" type="password" inputMode="numeric" value={confirmPin} onChange={(e) => { setConfirmPin(e.target.value); setError(null); }} icon="lock" placeholder="••••" />
        {error && <div style={{ fontSize: 12.5, color: 'var(--coral-700)', background: 'var(--coral-50)', border: '1px solid var(--coral-100)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>{error}</div>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', lineHeight: 1.5 }}>
          <Icon name="shield" size={13} color="var(--indigo-500)" style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Secure backend PIN hashing is not enabled yet. The PIN is <strong>not stored</strong> (plain or hashed) anywhere — this marks the account as PIN-set for the demo login. Real verification will use a Cloud Function + Firebase custom token.
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Salary & Leave ---------- */
function miniBtn(tone: 'green' | 'coral'): CSSProperties {
  const c = tone === 'green' ? ['var(--green-50)', 'var(--green-700)', 'var(--green-100)'] : ['var(--coral-50)', 'var(--coral-600)', 'var(--coral-100)'];
  return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 12.5, fontWeight: 600, border: `1px solid ${c[2]}`, borderRadius: 'var(--radius-sm)', background: c[0], color: c[1], cursor: 'pointer', fontFamily: 'var(--font-sans)' };
}

function LeaveRow({ label, value, tone }: { label: string; value: string; tone?: 'eligible' | 'deductible' | 'neutral' }) {
  const color = tone === 'eligible' ? 'var(--green-700)' : tone === 'deductible' ? 'var(--coral-600)' : 'var(--text-strong)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--text-body)' }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
}

function SalaryLeavePanel({ emp }: { emp: Employee }) {
  const { setLeaveStatus, setEmployeeBasis } = useAppStore();
  const b = employeeBreakdown(emp);
  const pendingCount = emp.leaves.filter((l) => l.status === 'pending').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card title="Salary basis">
          <KV label="Gross monthly salary" value={formatINR0(emp.salary)} mono />
          <div style={{ borderTop: '1px dashed var(--border-subtle)' }} />
          <div style={{ padding: '12px 0' }}>
            <Select
              label="Calculation basis"
              value={emp.basis}
              onChange={(e) => setEmployeeBasis(emp.id, e.target.value as Employee['basis'])}
              options={[
                { value: 'fixed30', label: 'Fixed 30-day' },
                { value: 'calendar', label: 'Actual calendar-day' },
              ]}
              hint="New joiners' first month always uses calendar-day"
            />
          </div>
          <div style={{ borderTop: '1px dashed var(--border-subtle)' }} />
          <KV label="Daily salary" value={formatINR(b.daily)} mono valueColor="var(--indigo-700)" />
        </Card>
        <Card title="This month — leave" subtitle="Free-leave bucket: 4 / month">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProgressBar label="Free leave used" value={b.freeLeaveUsed} max={4} tone={emp.leaveUsed > 4 ? 'amber' : 'green'} showValue valueText={`${b.freeLeaveUsed} / 4 used`} />
            <LeaveRow label="Leave days taken" value={`${emp.leaveUsed} days`} />
            <LeaveRow label="Free / paid leave" value={`${b.freeLeaveUsed} days`} tone="eligible" />
            <LeaveRow label="Deductible days" value={`${b.deductibleDays} days`} tone={b.deductibleDays > 0 ? 'deductible' : 'neutral'} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: b.leaveDeduction > 0 ? 'var(--coral-50)' : 'var(--green-50)', border: `1px solid ${b.leaveDeduction > 0 ? 'var(--coral-100)' : 'var(--green-100)'}`, borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: b.leaveDeduction > 0 ? 'var(--coral-700)' : 'var(--green-700)' }}>Leave deduction</span>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: b.leaveDeduction > 0 ? 'var(--coral-600)' : 'var(--green-700)' }}>
                {b.leaveDeduction > 0 ? '−' + formatINR(b.leaveDeduction) : formatINR(0)}
              </span>
            </div>
            {!b.eligible && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--amber-700)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
                <Icon name="info" size={14} style={{ marginTop: 1 }} />
                Not eligible for free leave — every leave/absent day is deductible.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Leave requests" subtitle="Approve or reject — paid/unpaid is auto-calculated" action={<Badge variant="pending">{pendingCount} pending</Badge>}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {emp.leaves.map((l, i) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 4px', borderBottom: i < emp.leaves.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--blue-50)', color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="calendar" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{l.dateLabel} · {l.days} day{l.days > 1 ? 's' : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.type} · {l.reason}</div>
              </div>
              {l.status === 'approved' ? (
                <Badge variant={l.paid ? 'eligible' : 'deductible'} dot>{l.paid ? 'Paid leave' : 'Deductible'}</Badge>
              ) : l.status === 'rejected' ? (
                <Badge variant="rejected" dot>Rejected</Badge>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={miniBtn('green')} onClick={() => setLeaveStatus(emp.id, l.id, 'approved')}>
                    <Icon name="check" size={15} /> Approve
                  </button>
                  <button style={miniBtn('coral')} onClick={() => setLeaveStatus(emp.id, l.id, 'rejected')} aria-label="Reject">
                    <Icon name="x" size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {emp.leaves.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No leave requests this month.</div>}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Advance ---------- */
function AdvancePanel({ emp, onAdd }: { emp: Employee; onAdd: () => void }) {
  const { updateAdvance } = useAppStore();
  const [editAdv, setEditAdv] = useState<Employee['advances'][number] | null>(null);
  const [detailAdv, setDetailAdv] = useState<Employee['advances'][number] | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const outstanding = employeeOutstandingAdvance(emp);

  const columns: Column<Employee['advances'][number]>[] = [
    { key: 'date', header: 'Date', render: (a) => a.date },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR0(a.amount)}</span> },
    { key: 'method', header: 'Method', render: (a) => <Badge variant="neutral" size="sm">{a.method}</Badge> },
    { key: 'ref', header: 'Reference', render: (a) => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--indigo-600)', fontSize: 12 }}>{a.ref}</span> },
    { key: 'note', header: 'Note', render: (a) => <span style={{ color: 'var(--text-muted)' }}>{a.note}</span> },
    { key: 'status', header: 'Status', render: (a) => (a.cleared ? <Badge variant="confirmed" size="sm" dot>Cleared</Badge> : <Badge variant="pending" size="sm" dot>Outstanding</Badge>) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) => (
        <span style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
          <IconButton icon="eye" label="View detail & schedule" size="sm" onClick={(e) => { e.stopPropagation(); setDetailAdv(a); }} />
          <IconButton icon="pencil" label="Edit advance" size="sm" onClick={(e) => { e.stopPropagation(); setEditAdv(a); }} />
        </span>
      ),
    },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'start' }}>
      <Card>
        <SectionLabel>Outstanding advance</SectionLabel>
        <div style={{ fontSize: 34, fontWeight: 800, color: outstanding > 0 ? 'var(--coral-600)' : 'var(--green-700)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{formatINR0(outstanding)}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Recoverable against upcoming salary</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
          <Button variant="primary" full iconLeft={<Icon name="plus" size={16} />} onClick={onAdd}>Record advance</Button>
          <Button variant="secondary" full iconLeft={<Icon name="calculator" size={16} />} disabled={outstanding === 0} onClick={() => setAdjustOpen(true)}>Adjust against salary</Button>
        </div>
      </Card>
      <Card title="Advance ledger" subtitle="Tap a row for detail & repayment schedule" padding="0">
        <ResponsiveTable columns={columns} rows={emp.advances} rowKey={(a) => a.id} minWidth={640} emptyText="No advances recorded." onRowClick={(a) => setDetailAdv(a)} />
      </Card>
      {detailAdv && <AdvanceDetailModal advance={detailAdv} employee={emp} onClose={() => setDetailAdv(null)} />}
      {editAdv && (
        <RecordAdvanceModal
          initial={editAdv}
          onClose={() => setEditAdv(null)}
          onSave={(patch) => {
            updateAdvance(emp.id, editAdv.id, patch);
            setEditAdv(null);
          }}
        />
      )}
      {adjustOpen && <AdvanceAdjustModal employee={emp} onClose={() => setAdjustOpen(false)} />}
    </div>
  );
}

/* ---------- Payments ---------- */
function PaymentsPanel({ emp, onAdd }: { emp: Employee; onAdd: () => void }) {
  const { updatePaymentStatus } = useAppStore();
  const columns: Column<Employee['payments'][number]>[] = [
    { key: 'type', header: 'Type', render: (p) => <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{p.type}</span> },
    { key: 'period', header: 'Period', render: (p) => <span style={{ color: 'var(--text-muted)' }}>{p.period}</span> },
    { key: 'date', header: 'Paid on', render: (p) => p.date },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-strong)' }}>{formatINR(p.amount)}</span> },
    { key: 'method', header: 'Method', render: (p) => <Badge variant="neutral" size="sm">{p.method}</Badge> },
    { key: 'ref', header: 'Reference', render: (p) => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--indigo-600)', fontSize: 12 }}>{p.ref}</span>, hideOnMobile: true },
    { key: 'receipt', header: 'Receipt', render: () => (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}><Icon name="paperclip" size={13} />View</span>), hideOnMobile: true },
    { key: 'conf', header: 'Confirmation', render: (p) => { const m = CONFIRMATION_META[p.status]; return <Badge variant={m.variant} dot>{m.label}</Badge>; } },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (p) =>
        p.status === 'pending' ? (
          <IconButton icon="bell" label="Send reminder" size="sm" onClick={() => updatePaymentStatus(emp.id, p.id, 'pending')} />
        ) : p.status === 'disputed' ? (
          <IconButton icon="refresh" label="Re-confirm" size="sm" onClick={() => updatePaymentStatus(emp.id, p.id, 'confirmed')} />
        ) : null,
    },
  ];
  return (
    <Card
      title="Payment history & receipts"
      subtitle="Permanent employee-wise ledger with confirmation status"
      padding="0"
      action={<Button variant="primary" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={onAdd}>Record payment</Button>}
    >
      <ResponsiveTable columns={columns} rows={emp.payments} rowKey={(p) => p.id} minWidth={920} emptyText="No payments recorded." />
    </Card>
  );
}

/* ---------- Tiffin ---------- */
function TiffinPanel({ emp }: { emp: Employee }) {
  const { addEmployeeTiffinLabel, updateEmployeeTiffinLabel, removeEmployeeTiffinLabel, setHalfTiffin, setTiffinEnabled, tiffinLabels } = useAppStore();
  const confirm = useConfirm();
  const [labelModal, setLabelModal] = useState<{ mode: 'add' | 'edit'; label?: TiffinLabel } | null>(null);
  const enabled = emp.tiffinEnabled !== false;
  const perDay = employeeTiffinPerDay(emp, tiffinLabels);
  const total = employeeTiffinTotal(emp, tiffinLabels);
  const usingGlobal = emp.tiffin.length === 0 && enabled;

  const removeLabel = async (t: TiffinLabel) => {
    const ok = await confirm({ title: 'Remove tiffin label?', message: `Remove “${t.label}” (${formatINR0(t.amount)}/day) from ${emp.name}'s tiffin setup.`, confirmLabel: 'Remove', tone: 'danger', icon: 'trash' });
    if (ok) removeEmployeeTiffinLabel(emp.id, t.id);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
      <Card title="Tiffin / food allowance setup" subtitle="Company-paid CTC — never a deduction" action={<Button variant="tonal" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={() => setLabelModal({ mode: 'add' })}>Add label</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Switch checked={enabled} onChange={(v) => setTiffinEnabled(emp.id, v)} label="Tiffin enabled for this employee" description="When off, tiffin CTC is ₹0 for this person." />
          {usingGlobal && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--blue-700)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
              <Icon name="info" size={14} style={{ marginTop: 1 }} /> Using the company default tiffin labels (₹{perDay}/day). Add labels below to customise per-employee.
            </div>
          )}
          {emp.tiffin.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--blue-50)', color: 'var(--blue-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="utensils" size={17} />
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{t.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{formatINR0(t.amount)}</span>
              <IconButton icon="pencil" label="Edit label" size="sm" onClick={() => setLabelModal({ mode: 'edit', label: t })} />
              <IconButton icon="trash" label="Remove label" size="sm" onClick={() => removeLabel(t)} />
            </div>
          ))}
          {emp.tiffin.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 2px' }}>No tiffin labels — add one to start.</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            <span>Per full day</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-strong)', fontWeight: 700 }}>{formatINR0(perDay)}</span>
          </div>
          <Switch checked={emp.halfTiffin} onChange={(v) => setHalfTiffin(emp.id, v)} label="Half-day tiffin eligible" description="Pay 50% allowance on half-day attendance" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
            <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
            No tiffin allowance is paid on paid-leave days.
          </div>
        </div>
      </Card>
      <Card title="This month — tiffin">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>Tiffin CTC payable ({CURRENT_MONTH.label.split(' ')[0]})</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue-600)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{formatINR0(total)}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{emp.tiffinDays} days × {formatINR0(perDay)} · on top of salary</span>
        </div>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <Badge variant="info" icon="utensils">Separately tracked &amp; reportable</Badge>
        </div>
      </Card>

      {labelModal && (
        <TiffinLabelModal
          initial={labelModal.label}
          onClose={() => setLabelModal(null)}
          onSave={(label, amount) => {
            if (labelModal.mode === 'edit' && labelModal.label) updateEmployeeTiffinLabel(emp.id, labelModal.label.id, { label, amount });
            else addEmployeeTiffinLabel(emp.id, { label, amount });
            setLabelModal(null);
          }}
        />
      )}
    </div>
  );
}

function TiffinLabelModal({ initial, onClose, onSave }: { initial?: TiffinLabel; onClose: () => void; onSave: (label: string, amount: number) => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const valid = label.trim() && Number(amount) >= 0 && amount !== '';
  return (
    <Modal
      icon="utensils"
      title={initial ? 'Edit tiffin label' : 'Add tiffin label'}
      subtitle="Company-paid CTC — taken daily at the branch"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" full onClick={onClose}>Cancel</Button>
          <Button variant="primary" full disabled={!valid} onClick={() => onSave(label.trim(), Number(amount))}>{initial ? 'Save' : 'Add label'}</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Breakfast" icon="utensils" />
        <Input label="Amount per day" prefix="₹" mono value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </div>
    </Modal>
  );
}

/* ---------- Documents ---------- */
function DocumentsPanel({ emp }: { emp: Employee }) {
  const { addDocument } = useAppStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentKind>('KYC');

  // TODO(backend): persist the actual uploaded file bytes; we store metadata only.
  const add = () => {
    if (!name.trim()) return;
    addDocument(emp.id, { name: name.trim(), type, status: 'pending' });
    setName('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
      <Card title="Documents" subtitle="KYC, profile & contract">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emp.documents.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="fileText" size={17} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{d.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{d.type}</div>
              </div>
              {d.status === 'verified' ? <Badge variant="confirmed" size="sm" dot>Verified</Badge> : <Badge variant="pending" size="sm" dot>Pending</Badge>}
              <IconButton icon="eye" label="View" size="sm" />
            </div>
          ))}
          {emp.documents.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 2px' }}>No documents yet.</div>}
        </div>
      </Card>
      <Card title="Add document">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Document name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aadhaar card" icon="fileText" />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as DocumentKind)} options={['KYC', 'Profile', 'Contract']} />
          <UploadZone label="Attach file (image / PDF)" />
          <Button variant="primary" full iconLeft={<Icon name="plus" size={16} />} disabled={!name.trim()} onClick={add}>Add document</Button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Login access ---------- */
const PORTAL_ITEMS = [
  'Attendance',
  'Salary history',
  'Advance history',
  'Tiffin / food allowance',
  'Payment receipts',
  'Leave status',
  'Salary slips',
  'Pending payment confirmations',
  'Company notices',
];

function lastLoginLabel(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const warnBox: CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--amber-700)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-sm)', padding: '9px 11px', marginTop: 10 };

function LoginPanel({ emp }: { emp: Employee }) {
  const { updatePortalAccess, branches } = useAppStore();
  const toast = useToast();
  const a = portalAccessOf(emp);
  const [note, setNote] = useState(a.loginNotes ?? '');
  const [setPinOpen, setSetPinOpen] = useState(false);
  const status = PORTAL_STATUS_META[a.loginStatus];
  const locked = isAccountLocked(a) || a.loginStatus === 'locked';
  const branchOptions = [{ value: '', label: 'Select branch…' }, ...activeBranches(branches).map((b) => ({ value: b.code, label: b.name }))];
  const needsBranch = managerNeedsBranch(a);

  // Admin-set lock: a far-future lockedUntil (cleared by Unlock).
  const lock = () => updatePortalAccess(emp.id, { lockedUntil: Date.now() + 365 * 24 * 60 * 60 * 1000, failedAttempts: 5 }, { action: 'Account locked', notify: { title: 'Account locked', message: 'Your portal login was locked by an admin.' } });

  const setEnabled = (next: boolean) =>
    updatePortalAccess(emp.id, { loginEnabled: next }, {
      action: next ? 'Portal login enabled' : 'Portal login disabled',
      notify: { title: next ? 'Portal access enabled' : 'Portal access disabled', message: next ? 'Your portal login is now enabled.' : 'Your portal access was disabled.' },
    });
  const setRole = (role: PortalRole) =>
    updatePortalAccess(emp.id, { portalRole: role }, { action: 'Portal role changed', notify: { title: 'Portal role updated', message: `Your portal role is now ${role}.` } });
  const setBranch = (code: string) => {
    const b = branches.find((x) => x.code === code);
    updatePortalAccess(emp.id, { managerBranchId: b?.id ?? null, managerBranchCode: b?.code ?? null }, { action: 'Manager branch changed', notify: { title: 'Branch assignment updated', message: `You now manage ${b?.name ?? '—'}.` } });
  };
  const unlock = () =>
    updatePortalAccess(emp.id, { failedAttempts: 0, lockedUntil: null }, { action: 'Account unlocked', notify: { title: 'Account unlocked', message: 'Your portal login was unlocked.' } });
  const clearAttempts = () => updatePortalAccess(emp.id, { failedAttempts: 0 }, { action: 'Failed attempts cleared' });
  const setFallback = (next: boolean) => updatePortalAccess(emp.id, { passwordFallbackAllowed: next }, { action: next ? 'Password fallback enabled' : 'Password fallback disabled' });
  const saveNote = () => updatePortalAccess(emp.id, { loginNotes: note.trim() }, { action: 'Login note updated' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
      <Card title="Portal access" subtitle="Admin-managed login for this person">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          <Badge variant={status.variant} dot>{status.label}</Badge>
          <Badge variant={a.portalRole === 'manager' ? 'brand' : 'neutral'} icon={a.portalRole === 'manager' ? 'badgeCheck' : 'user'}>{a.portalRole === 'manager' ? 'Manager access' : 'Employee access'}</Badge>
          <Badge variant={a.passwordFallbackAllowed ? 'info' : 'locked'} size="sm">{a.passwordFallbackAllowed ? 'Password fallback on' : 'Password fallback off'}</Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: a.loginEnabled ? 'var(--green-50)' : 'var(--neutral-100)', border: `1px solid ${a.loginEnabled ? 'var(--green-100)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Icon name={a.loginEnabled ? 'unlock' : 'lock'} size={20} color={a.loginEnabled ? 'var(--green-600)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{a.loginEnabled ? 'Login enabled' : 'Login disabled'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last login: {lastLoginLabel(a.lastLoginAt)}</div>
            </div>
          </div>
          <Switch checked={a.loginEnabled} onChange={setEnabled} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          <Select label="Portal role" value={a.portalRole} onChange={(e) => setRole(e.target.value as PortalRole)} options={[{ value: 'employee', label: 'Employee' }, { value: 'manager', label: 'Manager' }]} />
          {a.portalRole === 'manager' && <Select label="Manager branch" value={a.managerBranchCode ?? ''} onChange={(e) => setBranch(e.target.value)} options={branchOptions} />}
        </div>
        {needsBranch && (
          <div style={warnBox}>
            <Icon name="alert" size={14} style={{ marginTop: 1 }} /> Manager branch assignment required.
          </div>
        )}

        <div style={{ display: 'flex', gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" iconLeft={<Icon name="lock" size={15} />} onClick={() => setSetPinOpen(true)}>{a.pinSet ? 'Reset PIN' : 'Set PIN'}</Button>
          {locked ? (
            <Button variant="secondary" size="sm" iconLeft={<Icon name="unlock" size={15} />} onClick={unlock}>Unlock</Button>
          ) : (
            <Button variant="secondary" size="sm" iconLeft={<Icon name="lock" size={15} />} disabled={!a.loginEnabled} onClick={lock}>Lock</Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearAttempts}>Clear attempts ({a.failedAttempts})</Button>
          <Button variant="ghost" size="sm" iconLeft={<Icon name="mail" size={15} />} disabled={!a.loginEnabled} onClick={() => toast(`Portal invite sent to ${emp.name}`)}>Invite</Button>
        </div>

        <div style={{ marginTop: 14 }}>
          <Switch checked={a.passwordFallbackAllowed} onChange={setFallback} label="Allow password login (fallback)" description="When off, only PIN login is offered to this user." />
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input label="Login note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Shares branch device" />
          </div>
          <Button variant="secondary" onClick={saveNote} disabled={note.trim() === (a.loginNotes ?? '')}>Save</Button>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
          <Icon name="shield" size={13} color="var(--indigo-500)" style={{ verticalAlign: '-2px', marginRight: 4 }} />
          {/* TODO(backend): the PIN is verified by a Cloud Function against a salted hash. */}
          Setting a PIN marks the account active. <strong>No PIN (plain or hashed) is stored</strong> — secure hashing + verification will move to a Cloud Function.
        </div>
      </Card>
      {setPinOpen && <SetPinModal emp={emp} onClose={() => setSetPinOpen(false)} />}

      <Card title="What the employee can see" subtitle="Read-only self-service portal">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PORTAL_ITEMS.map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <Icon name="circleCheck" size={15} color={a.loginEnabled ? 'var(--green-500)' : 'var(--neutral-400)'} />
              <span style={{ fontSize: 12.5, color: a.loginEnabled ? 'var(--text-body)' : 'var(--text-muted)', fontWeight: 500 }}>{p}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Connected modals ---------- */
function AdvanceModalConnected({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { addAdvance, addPayment } = useAppStore();
  return (
    <RecordAdvanceModal
      onClose={onClose}
      onSave={(a) => {
        addAdvance(emp.id, a);
        // The disbursement also enters the payment ledger for the employee to confirm.
        addPayment(emp.id, { type: 'Advance', period: CURRENT_MONTH.short, date: a.date, amount: a.amount, method: a.method, ref: a.ref, status: 'pending' });
        onClose();
      }}
    />
  );
}

function PaymentModalConnected({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { addPayment } = useAppStore();
  return <RecordPaymentModal onClose={onClose} onSave={(p) => { addPayment(emp.id, p); onClose(); }} />;
}

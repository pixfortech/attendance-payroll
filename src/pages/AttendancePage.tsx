import { useState } from 'react';
import { Avatar, Badge, Button, Card, Icon, Select, Tabs } from '../components/ui';
import { PROOF_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import { PROOF_METHOD_LABEL } from '../services/attendance';
import { BRANCH_NAMES, CURRENT_MONTH } from '../data';
import type { AttendanceRecord } from '../types';
import type { IconName } from '../components/ui';

type Mark = 'P' | 'A' | 'H' | 'L' | 'O';
const MARK: Record<Mark, { bg: string; fg: string; bd: string }> = {
  P: { bg: 'var(--green-50)', fg: 'var(--green-700)', bd: 'var(--green-100)' },
  A: { bg: 'var(--coral-50)', fg: 'var(--coral-700)', bd: 'var(--coral-100)' },
  H: { bg: 'var(--amber-50)', fg: 'var(--amber-700)', bd: 'var(--amber-100)' },
  L: { bg: 'var(--blue-50)', fg: 'var(--blue-700)', bd: 'var(--blue-100)' },
  O: { bg: 'var(--neutral-100)', fg: 'var(--neutral-400)', bd: 'var(--neutral-200)' },
};
const DAYS = CURRENT_MONTH.workingDays;

function genRow(seed: number): Mark[] {
  const out: Mark[] = [];
  let s = seed;
  for (let d = 1; d <= DAYS; d++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    if (d % 7 === 0) out.push('O');
    else if (r > 0.93) out.push('A');
    else if (r > 0.88) out.push('L');
    else if (r > 0.84) out.push('H');
    else out.push('P');
  }
  return out;
}
function hashSeed(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
}

const METHODS: { icon: IconName; name: string; desc: string; status: string; tone: 'paid' | 'pending' | 'neutral' }[] = [
  { icon: 'qr', name: 'QR attendance', desc: 'Branch QR scan check-in', status: 'Live', tone: 'paid' },
  { icon: 'mapPin', name: 'GPS + selfie', desc: 'Geo-fenced selfie punch', status: 'Beta', tone: 'pending' },
  { icon: 'fingerprint', name: 'Biometric', desc: 'Device fingerprint sync', status: 'Planned', tone: 'neutral' },
  { icon: 'refresh', name: 'Offline sync', desc: 'Queue punches, sync later', status: 'Planned', tone: 'neutral' },
  { icon: 'badgeCheck', name: 'Manager approval', desc: 'Branch manager sign-off', status: 'Live', tone: 'paid' },
];

export function AttendancePage() {
  const { employees, checkins } = useAppStore();
  const isMobile = useIsMobile();
  const [view, setView] = useState('grid');
  const [branch, setBranch] = useState(BRANCH_NAMES[0]);

  const staff = employees.map((e) => {
    const days = genRow(hashSeed(e.id));
    const present = days.filter((d) => d === 'P').length;
    const half = days.filter((d) => d === 'H').length;
    const absent = days.filter((d) => d === 'A').length;
    const leave = days.filter((d) => d === 'L').length;
    return { id: e.id, name: e.name, role: e.role, days, present, absent, leave, worked: present + half * 0.5 };
  });

  const pendingApproval = checkins.filter((c) => !c.approved).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          variant="pill"
          value={view}
          onChange={setView}
          items={[
            { id: 'grid', label: 'Month grid', icon: 'calendar' },
            { id: 'proof', label: 'Proof', icon: 'shield', count: pendingApproval || undefined },
            { id: 'methods', label: 'Capture', icon: 'qr' },
          ]}
        />
        <div style={{ flex: 1 }} />
        {view === 'grid' && (
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCH_NAMES} />
          </div>
        )}
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Export</Button>
      </div>

      {view === 'grid' && (isMobile ? <MonthGridMobile staff={staff} branch={branch} /> : <MonthGridDesktop staff={staff} branch={branch} />)}
      {view === 'proof' && <ProofView checkins={checkins} />}
      {view === 'methods' && <MethodsView branch={branch} />}
    </div>
  );
}

type Staff = { id: string; name: string; role: string; days: Mark[]; present: number; absent: number; leave: number; worked: number };

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {([['P', 'Present', 'paid'], ['A', 'Absent', 'absent'], ['H', 'Half', 'half'], ['L', 'Leave', 'leave'], ['O', 'Off', 'neutral']] as const).map(([k, l, v]) => (
        <Badge key={k} variant={v} size="sm" dot>{l}</Badge>
      ))}
    </div>
  );
}

function MonthGridDesktop({ staff, branch }: { staff: Staff[]; branch: string }) {
  return (
    <Card padding="0">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>Attendance — {CURRENT_MONTH.label}</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{branch} · {DAYS} working days · tap a cell to edit</p>
        </div>
        <Legend />
      </div>
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.role}</div>
                    </div>
                  </div>
                </td>
                {s.days.map((d, i) => {
                  const m = MARK[d];
                  return (
                    <td key={i} style={{ textAlign: 'center', padding: '4px 2px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: m.bg, color: m.fg, border: `1px solid ${m.bd}` }}>{d === 'O' ? '·' : d}</span>
                    </td>
                  );
                })}
                <td style={{ textAlign: 'right', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', fontFamily: 'var(--font-mono)' }}>{s.worked}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> d</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MonthGridMobile({ staff, branch }: { staff: Staff[]; branch: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>Attendance — {CURRENT_MONTH.label}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{branch} · {DAYS} working days</p>
          </div>
          <Legend />
        </div>
      </Card>
      {staff.map((s) => (
        <Card key={s.id} bodyStyle={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Avatar name={s.name} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{s.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.role}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-strong)' }}>{s.worked}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> d worked</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 12 }}>
            <span style={{ color: 'var(--green-700)', fontWeight: 600 }}>{s.present} present</span>
            <span style={{ color: 'var(--blue-700)', fontWeight: 600 }}>{s.leave} leave</span>
            <span style={{ color: 'var(--coral-700)', fontWeight: 600 }}>{s.absent} absent</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {s.days.map((d, i) => {
              const m = MARK[d];
              return (
                <span key={i} title={`Day ${i + 1}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 700, background: m.bg, color: m.fg, border: `1px solid ${m.bd}` }}>{d === 'O' ? '·' : d}</span>
              );
            })}
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

function ProofView({ checkins }: { checkins: AttendanceRecord[] }) {
  const { approveCheckin } = useAppStore();
  const pending = checkins.filter((c) => !c.approved);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {pending.length > 0 && (
        <Card title="Pending manager approval" subtitle="Weak-proof check-ins held for sign-off" action={<Badge variant="pending">{pending.length}</Badge>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((c) => (
              <CheckinRow key={c.id} c={c} onApprove={() => approveCheckin(c.id)} />
            ))}
          </div>
        </Card>
      )}
      <Card title="Today — check-ins" subtitle="Proof factors captured at check-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {checkins.map((c) => (
            <CheckinRow key={c.id} c={c} onApprove={c.approved ? undefined : () => approveCheckin(c.id)} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function CheckinRow({ c, onApprove }: { c: AttendanceRecord; onApprove?: () => void }) {
  const proof = PROOF_META[c.strength];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '13px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
        <Avatar name={c.employeeName} size={36} status="present" />
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{c.employeeName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.branch} · {PROOF_METHOD_LABEL[c.method]} · {c.time}</div>
        </div>
        <Badge variant={proof.variant} dot>{proof.label}</Badge>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Factor ok={c.factors.qrMatched} label="QR" />
        <Factor ok={c.factors.gpsInsideRadius} label="GPS" />
        <Factor ok={c.factors.wifiMatched} label="Wi-Fi" />
        <Factor ok={c.factors.selfieCaptured} label="Selfie" />
        <Factor ok={c.factors.managerApproved} label="Manager" />
      </div>
      {!c.approved && onApprove && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <Badge variant="pending" icon="info">Pending manager approval</Badge>
          <Button variant="primary" size="sm" iconLeft={<Icon name="check" size={14} />} onClick={onApprove}>Approve</Button>
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

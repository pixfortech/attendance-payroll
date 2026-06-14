import { useState } from 'react';
import { Avatar, Badge, Button, Card, Icon, ProgressBar, Select, Tabs } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { BRANCH_NAMES, CURRENT_MONTH } from '../data';
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

const PUNCHES: [string, string, IconName][] = [
  ['Subir Maity', 'QR · 9:02 AM', 'qr'],
  ['Rina Das', 'GPS+selfie · 9:11 AM', 'mapPin'],
  ['Mou Pal', 'QR · 9:18 AM', 'qr'],
  ['Kartik Sen', 'Manager · 9:25 AM', 'badgeCheck'],
];

export function AttendancePage() {
  const { employees } = useAppStore();
  const [view, setView] = useState('grid');
  const [branch, setBranch] = useState(BRANCH_NAMES[0]);

  const staff = employees.map((e) => {
    const days = genRow(hashSeed(e.id));
    const present = days.filter((d) => d === 'P').length;
    const half = days.filter((d) => d === 'H').length;
    return { name: e.name, role: e.role, days, worked: present + half * 0.5 };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Tabs
          variant="pill"
          value={view}
          onChange={setView}
          items={[
            { id: 'grid', label: 'Month grid', icon: 'calendar' },
            { id: 'methods', label: 'Capture methods', icon: 'qr' },
          ]}
        />
        <div style={{ flex: 1 }} />
        <div style={{ width: 200 }}>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} options={BRANCH_NAMES} />
        </div>
        <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Export</Button>
      </div>

      {view === 'grid' ? (
        <Card padding="0">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>Attendance — {CURRENT_MONTH.label}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{branch} · {DAYS} working days · tap a cell to edit</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([['P', 'Present', 'paid'], ['A', 'Absent', 'absent'], ['H', 'Half', 'half'], ['L', 'Leave', 'leave'], ['O', 'Off', 'neutral']] as const).map(([k, l, v]) => (
                <Badge key={k} variant={v} size="sm" dot>{l}</Badge>
              ))}
            </div>
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
                  <tr key={s.name}>
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
      ) : (
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
          <Card title="Today — live punches" subtitle={branch}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>35</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>/ 38 checked in</span>
              </div>
              <ProgressBar value={35} max={38} tone="green" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                {PUNCHES.map(([n, t, ic]) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <Avatar name={n} size={34} status="present" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{n}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name={ic} size={12} />
                        {t}
                      </div>
                    </div>
                    <Icon name="circleCheck" size={18} color="var(--green-500)" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

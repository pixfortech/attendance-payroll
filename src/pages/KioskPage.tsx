import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Icon, Input, Select, Switch } from '../components/ui';
import { PROOF_META } from '../components/payroll/statusMeta';
import { useAppStore } from '../store/AppStore';
import { activeBranchNames } from '../lib/branches';
import type { Employee, ProofFactors, ProofStrength } from '../types';
import logo from '../assets/ganguram-logo.png';
import gauri from '../assets/gauri-mascot.png';

type Step = 'select' | 'confirm' | 'done';

function nowTime(): string {
  return new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function KioskPage() {
  const navigate = useNavigate();
  const { employees, branches, addCheckin } = useAppStore();
  const branchNames = activeBranchNames(branches);
  const [branchName, setBranchName] = useState(branchNames[0] ?? '');
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [selfie, setSelfie] = useState(false);
  const [manager, setManager] = useState(false);
  const [doneMode, setDoneMode] = useState<'in' | 'out'>('in');
  const [result, setResult] = useState<{ strength: ProofStrength; approved: boolean } | null>(null);

  const branch = branches.find((b) => b.name === branchName);
  const branchStaff = useMemo(() => employees.filter((e) => e.branch === branchName && e.status === 'active'), [employees, branchName]);

  const pick = (e: Employee) => {
    setSelected(e);
    setSelfie(false);
    setManager(false);
    setStep('confirm');
  };

  const findByPin = () => {
    const q = pin.trim().toLowerCase();
    const match = employees.find((e) => e.id.toLowerCase() === q || e.id.toLowerCase().endsWith(q));
    if (match) pick(match);
  };

  const submit = (m: 'in' | 'out') => {
    if (!selected) return;
    setDoneMode(m);
    // A shared branch device sits inside the branch: GPS + Wi-Fi are satisfied.
    const factors: ProofFactors = {
      qrMatched: false,
      gpsInsideRadius: true,
      wifiMatched: true,
      selfieCaptured: selfie,
      managerApproved: manager,
    };
    const res = addCheckin({ employeeId: selected.id, employeeName: selected.name, branch: branchName, method: 'kiosk', factors, time: nowTime() });
    setResult(res);
    setStep('done');
  };

  const reset = () => {
    setSelected(null);
    setPin('');
    setResult(null);
    setStep('select');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--indigo-50) 0%, var(--surface-page) 40%)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)' }}>
        <img src={logo} alt="Ganguram" style={{ height: 36 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Branch kiosk</span>
        <div style={{ flex: 1 }} />
        <div style={{ width: 200, maxWidth: '45vw' }}>
          <Select value={branchName} onChange={(e) => { setBranchName(e.target.value); reset(); }} options={branchNames} />
        </div>
        <Button variant="ghost" size="sm" iconLeft={<Icon name="logout" size={15} />} onClick={() => navigate('/branches')}>Exit</Button>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: 720, maxWidth: '100%' }}>
          {step === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--indigo-700)', letterSpacing: '-0.02em' }}>Mark your attendance</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{branchName} · tap your name or enter your Employee ID</p>
              </div>

              <Card>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                  {branchStaff.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => pick(e)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '18px 12px', minHeight: 120, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = 'var(--neutral-50)')}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = 'var(--surface-card)')}
                    >
                      <Avatar name={e.name} size={52} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-strong)' }}>{e.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{e.role}</div>
                      </div>
                    </button>
                  ))}
                  {branchStaff.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>No active staff at this branch.</div>}
                </div>
              </Card>

              <Card title="Enter Employee ID / PIN" subtitle="For staff not shown above">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 220px' }}>
                    <Input label="Employee ID" mono value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. 0142 or GNG-BD-0142" icon="user" />
                  </div>
                  <Button variant="primary" iconRight={<Icon name="chevronRight" size={16} />} onClick={findByPin}>Continue</Button>
                </div>
              </Card>
            </div>
          )}

          {step === 'confirm' && selected && (
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                <Avatar name={selected.name} size={72} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-strong)' }}>{selected.name}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.role} · {branchName} · {nowTime()}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <Icon name="mapPin" size={18} color="var(--green-600)" />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>At branch device</span>
                  <Badge variant="confirmed" size="sm" dot>GPS + Wi-Fi</Badge>
                </div>
                <Switch checked={selfie} onChange={setSelfie} label="Capture selfie" description="Optional photo proof from the kiosk camera" />
                <Switch checked={manager} onChange={setManager} label="Manager confirms" description="Branch manager verifies this check-in" />
                {branch?.geofence.selfieRequired && !selfie && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--amber-700)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-sm)', padding: '9px 11px' }}>
                    <Icon name="info" size={14} style={{ marginTop: 1 }} /> This branch prefers a selfie at check-in.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="ghost" onClick={reset}>Cancel</Button>
                <Button variant="secondary" full iconLeft={<Icon name="logout" size={16} />} onClick={() => submit('out')}>Check out</Button>
                <Button variant="primary" full iconLeft={<Icon name="badgeCheck" size={17} />} onClick={() => submit('in')}>Check in</Button>
              </div>
            </Card>
          )}

          {step === 'done' && selected && result && (
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '8px 0' }}>
                <img src={gauri} alt="Gauri" style={{ height: 130, filter: 'drop-shadow(0 12px 22px rgba(38,37,74,0.16))' }} />
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--indigo-700)' }}>{doneMode === 'in' ? 'Checked in' : 'Checked out'}</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Dhonnobad, {selected.name.split(' ')[0]} — checked {doneMode === 'in' ? 'in' : 'out'} at {branchName}.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge variant={PROOF_META[result.strength].variant} dot>{PROOF_META[result.strength].label}</Badge>
                  {result.approved ? <Badge variant="confirmed" icon="circleCheck">Approved</Badge> : <Badge variant="pending" icon="clock">Pending manager approval</Badge>}
                </div>
                <Button variant="primary" iconLeft={<Icon name="check" size={16} />} onClick={reset} style={{ marginTop: 6 }}>Done</Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

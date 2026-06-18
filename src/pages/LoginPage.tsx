import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, Icon, Input } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { useAuth } from '../auth/AuthProvider';
import { findLoginUser, isPinFormat, MAX_PIN_ATTEMPTS, verifyPinLogin } from '../lib/pinAuth';
import { isAccountLocked, portalAccessOf } from '../lib/portalAccess';
import type { Employee, PortalRole, Role } from '../types';
import logo from '../assets/ganguram-logo.png';
import gauri from '../assets/gauri-mascot.png';

const TRUST_CHIPS: { label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { label: 'Attendance', icon: 'calendar' },
  { label: 'Salary', icon: 'wallet' },
  { label: 'Payments', icon: 'banknote' },
  { label: 'Leave', icon: 'clock' },
];

const ROLES: { id: Role; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'admin', label: 'Admin', icon: 'shield' },
  { id: 'manager', label: 'Manager', icon: 'badgeCheck' },
  { id: 'employee', label: 'Employee', icon: 'user' },
];

type PortalStep = 'identify' | 'pin' | 'password';

/** True once, if we were just bounced here by an expired session. */
function readExpiredFlag(): boolean {
  try {
    const flag = sessionStorage.getItem('gng.sessionExpired');
    if (flag) sessionStorage.removeItem('gng.sessionExpired');
    return !!flag;
  } catch {
    return false;
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const { employees, branches, login } = useAppStore();
  const { configured, signIn } = useAuth();

  const [role, setRole] = useState<Role>('admin');
  // Admin (Firebase) credentials — entered ONCE here (no separate re-entry page)
  const [email, setEmail] = useState(configured ? '' : 'demo@ganguram.in');
  const [adminPassword, setAdminPassword] = useState(configured ? '' : 'demo');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  // Manager / Employee
  const [step, setStep] = useState<PortalStep>('identify');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [expired] = useState(readExpiredFlag);

  const locked = attempts >= MAX_PIN_ATTEMPTS;
  // Generic failure — never reveals whether the ID/mobile actually exists.
  const GENERIC_FAIL = 'Couldn’t sign you in. Check your ID and PIN, or contact your admin.';
  // Hide the password fallback when the matched account disallows it.
  const matched = findLoginUser(employees, identifier);
  const fallbackAllowed = matched ? portalAccessOf(matched).passwordFallbackAllowed : true;

  const resetPortal = (nextRole: Role) => {
    setRole(nextRole);
    setStep('identify');
    setIdentifier('');
    setPin('');
    setPassword('');
    setError(null);
    setAttempts(0);
    setShowReset(false);
  };

  const grantPortal = (user: Employee) => {
    setAttempts(0);
    // DEMO: the record matched + the PIN/password passed local checks only.
    // TODO(backend): verify the PIN hash and sign in with a Firebase custom
    // token before creating the session — never trust the client alone.
    if (role === 'manager') {
      // Managers operate on their assigned branch (falls back to their own).
      const access = portalAccessOf(user);
      const branch = access.managerBranchCode ? branches.find((b) => b.code === access.managerBranchCode)?.name ?? user.branch : user.branch;
      login({ role: 'manager', name: user.name, branch, employeeId: user.id });
      navigate('/manager');
    } else {
      login({ role: 'employee', name: user.name, employeeId: user.id });
      navigate('/portal');
    }
  };

  const continueToPin = () => {
    setError(null);
    if (!identifier.trim()) {
      setError('Enter your Employee ID, Manager ID or mobile number.');
      return;
    }
    // Do NOT reveal whether the account exists here — always advance to PIN
    // entry, then fail generically. (Avoids an account-enumeration oracle.)
    setPin('');
    setAttempts(0);
    setError(null);
    setStep('pin');
  };

  const submitPin = (value = pin) => {
    if (locked) return;
    if (!isPinFormat(value)) {
      setError('Enter your 4- or 6-digit PIN.');
      return;
    }
    const result = verifyPinLogin(employees, identifier, value, role as PortalRole);
    if (result.ok) {
      grantPortal(result.employee);
      return;
    }
    setPin('');
    // Account-state failures (disabled / locked / PIN-required) aren't "attempts".
    if (result.reason === 'disabled' || result.reason === 'locked' || result.reason === 'pin_required') {
      setError(result.message);
      return;
    }
    // not_found stays generic (no enumeration); wrong portal explains the role.
    setAttempts((a) => a + 1);
    setError(result.reason === 'wrong_portal' ? result.message : GENERIC_FAIL);
  };

  const pushDigit = (d: string) => {
    if (locked) return;
    setError(null);
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length === 6) submitPin(next); // phone-lock style auto-submit at 6
  };
  const backspace = () => setPin((p) => p.slice(0, -1));

  const submitPassword = () => {
    setError(null);
    const user = findLoginUser(employees, identifier);
    if (!user || !password) {
      setError(GENERIC_FAIL);
      return;
    }
    const access = portalAccessOf(user);
    if (!access.loginEnabled) {
      setError('Portal access is disabled. Contact your admin.');
      return;
    }
    if (isAccountLocked(access)) {
      setError('Account locked — contact your admin to unlock.');
      return;
    }
    if (access.portalRole !== role) {
      setError(`This account is not set up for ${role} login.`);
      return;
    }
    if (!access.passwordFallbackAllowed) {
      setError('Password login is disabled for this account. Use your PIN.');
      return;
    }
    grantPortal(user); // DEMO password fallback — backend will verify a real credential.
  };

  // Admin signs in ONCE on this screen. With Firebase configured we verify the
  // email/password here (no redirect to a second email/password page); in demo
  // mode any credentials enter the suite.
  const signInAdmin = async () => {
    setAdminError(null);
    if (!configured) {
      login({ role: 'admin', name: 'Master Admin' });
      navigate('/');
      return;
    }
    setAdminBusy(true);
    try {
      await signIn(email.trim(), adminPassword);
      login({ role: 'admin', name: email.trim() || 'Master Admin' });
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setAdminError(
        code.includes('invalid') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'Incorrect email or password.'
          : code.includes('too-many-requests')
            ? 'Too many attempts — try again later.'
            : (err as Error).message || 'Sign-in failed.',
      );
    } finally {
      setAdminBusy(false);
    }
  };

  const onAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void signInAdmin();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflow: 'hidden',
        background: 'radial-gradient(120% 90% at 50% -10%, var(--indigo-100) 0%, var(--surface-page) 55%)',
      }}
    >
      <div style={{ width: 440, maxWidth: '100%' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--radius-2xl)',
            background: 'linear-gradient(150deg, var(--indigo-600) 0%, var(--indigo-800) 62%, var(--indigo-900) 100%)',
            color: '#fff',
            padding: '22px 22px 34px',
            boxShadow: 'var(--shadow-brand)',
          }}
        >
          <div style={{ position: 'absolute', top: -54, right: -44, width: 184, height: 184, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,84,84,0.45) 0%, transparent 68%)' }} />
          <div style={{ position: 'absolute', bottom: -70, left: -40, width: 210, height: 210, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '18px 18px', opacity: 0.5 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <img src={logo} alt="Ganguram" style={{ height: 30, filter: 'brightness(0) invert(1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
              <img src={gauri} alt="Gauri" style={{ height: 84, flexShrink: 0, filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--coral-300)' }}>
                  Namaste <span aria-hidden>🙏</span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginTop: 4, lineHeight: 1.15 }}>Welcome back</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 1.45 }}>Ganguram staff portal</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 16 }}>
              {TRUST_CHIPS.map((c) => (
                <span key={c.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 'var(--radius-pill)', padding: '5px 11px' }}>
                  <Icon name={c.icon} size={13} /> {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginTop: -22, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', padding: 24 }}>
          {expired && (
            <div role="alert" style={banner('amber')}>
              <Icon name="clock" size={15} color="var(--amber-700)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sign in as</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 4 }}>
            {ROLES.map((r) => (
              <Chip key={r.id} kind="filter" active={role === r.id} icon={r.icon} onClick={() => resetPortal(r.id)} style={{ flex: 1, justifyContent: 'center' }}>
                {r.label}
              </Chip>
            ))}
          </div>
          <div style={{ width: 36, height: 3, borderRadius: 'var(--radius-pill)', background: 'var(--brand-accent)', marginTop: 12 }} />

          {role === 'admin' ? (
            <AdminForm email={email} password={adminPassword} onEmail={(v) => { setEmail(v); setAdminError(null); }} onPassword={(v) => { setAdminPassword(v); setAdminError(null); }} onSubmit={onAdminSubmit} configured={configured} error={adminError} busy={adminBusy} />
          ) : (
            <PortalAuth
              role={role}
              step={step}
              identifier={identifier}
              pin={pin}
              password={password}
              error={error}
              locked={locked}
              fallbackAllowed={fallbackAllowed}
              showReset={showReset}
              onIdentifier={(v) => { setIdentifier(v); setError(null); }}
              onContinue={continueToPin}
              onPushDigit={pushDigit}
              onBackspace={backspace}
              onSubmitPin={() => submitPin()}
              onPassword={(v) => { setPassword(v); setError(null); }}
              onSubmitPassword={submitPassword}
              onUsePassword={() => { setStep('password'); setError(null); }}
              onUsePin={() => { setStep('pin'); setPin(''); setError(null); }}
              onBack={() => { setStep('identify'); setError(null); }}
              onToggleReset={() => setShowReset((s) => !s)}
            />
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-subtle)', marginTop: 16 }}>Ganguram Sweets · since 1885</div>
      </div>
    </div>
  );
}

/* ---------- Admin (Firebase email/password) — a SINGLE form, no re-entry ---------- */
function AdminForm({ email, password, onEmail, onPassword, onSubmit, configured, error, busy }: { email: string; password: string; onEmail: (v: string) => void; onPassword: (v: string) => void; onSubmit: (e: React.FormEvent) => void; configured: boolean; error: string | null; busy: boolean }) {
  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>Master Admin signs in with the secure Firebase email/password account.</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
        <Input label="Email" type="email" value={email} onChange={(e) => onEmail(e.target.value)} icon="mail" placeholder="admin@ganguram.in" />
        <Input label="Password" type="password" value={password} onChange={(e) => onPassword(e.target.value)} icon="lock" />
        {error && <ErrorNote text={error} />}
        <Button variant="primary" size="lg" full type="submit" loading={busy} iconRight={busy ? undefined : <Icon name="chevronRight" size={17} />}>Sign in to admin suite</Button>
      </form>
      <div style={infoBox()}>
        <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1, flexShrink: 0 }} />
        <span><strong style={{ fontWeight: 700 }}>Secure admin login</strong> — admin uses Firebase Auth{configured ? ' (verified on this screen)' : '; any credentials sign you in when Firebase is not configured'}.</span>
      </div>
    </>
  );
}

/* ---------- Manager / Employee: PIN-first, password fallback ---------- */
function PortalAuth(props: {
  role: Role;
  step: PortalStep;
  identifier: string;
  pin: string;
  password: string;
  error: string | null;
  locked: boolean;
  fallbackAllowed: boolean;
  showReset: boolean;
  onIdentifier: (v: string) => void;
  onContinue: () => void;
  onPushDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmitPin: () => void;
  onPassword: (v: string) => void;
  onSubmitPassword: () => void;
  onUsePassword: () => void;
  onUsePin: () => void;
  onBack: () => void;
  onToggleReset: () => void;
}) {
  const { role, step, identifier, pin, password, error, locked, fallbackAllowed, showReset } = props;
  const who = role === 'manager' ? 'Branch managers' : 'Employees';

  if (step === 'identify') {
    return (
      <>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>{who} sign in with their ID or mobile, then a PIN.</p>
        <form onSubmit={(e) => { e.preventDefault(); props.onContinue(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <Input label="Employee / Manager ID or mobile" value={identifier} onChange={(e) => props.onIdentifier(e.target.value)} icon="user" placeholder="e.g. GNG-BD-0142 or 98300 11422" />
          {error && <ErrorNote text={error} />}
          <Button variant="primary" size="lg" full type="submit" iconRight={<Icon name="chevronRight" size={17} />}>Continue</Button>
        </form>
        {fallbackAllowed && (
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button type="button" onClick={props.onUsePassword} style={linkBtn}>Log in with password instead</button>
          </div>
        )}
        <div style={infoBox()}>
          <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1, flexShrink: 0 }} />
          <span><strong style={{ fontWeight: 700 }}>Demo PIN login</strong> — the PIN is checked locally only; secure backend verification + token login is coming. No PIN is stored.</span>
        </div>
      </>
    );
  }

  if (step === 'password') {
    return (
      <>
        <PortalHeader title="Log in with password" subtitle="Fallback access" onBack={props.onBack} />
        <form onSubmit={(e) => { e.preventDefault(); props.onSubmitPassword(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <Input label="Employee / Manager ID or mobile" value={identifier} onChange={(e) => props.onIdentifier(e.target.value)} icon="user" />
          <Input label="Password" type="password" value={password} onChange={(e) => props.onPassword(e.target.value)} icon="lock" />
          {error && <ErrorNote text={error} />}
          <Button variant="primary" size="lg" full type="submit" iconRight={<Icon name="chevronRight" size={17} />}>Sign in</Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" onClick={props.onUsePin} style={linkBtn}>Use PIN instead</button>
        </div>
      </>
    );
  }

  // step === 'pin' — phone-lock style keypad (primary)
  return (
    <>
      <PortalHeader title="Enter your PIN" subtitle={identifier || 'PIN login'} onBack={props.onBack} />

      <PinDots length={pin.length} />

      {locked ? (
        <div role="alert" style={{ ...banner('coral'), marginTop: 18, justifyContent: 'center', textAlign: 'center' }}>
          <Icon name="lock" size={15} color="var(--coral-600)" style={{ marginTop: 1, flexShrink: 0 }} />
          <span><strong style={{ fontWeight: 700 }}>Too many failed attempts.</strong> PIN login is temporarily locked — reset your PIN or contact your admin.</span>
        </div>
      ) : (
        error && <div style={{ marginTop: 14 }}><ErrorNote text={error} center /></div>
      )}

      <PinKeypad disabled={locked} canSubmit={isPinFormat(pin)} onDigit={props.onPushDigit} onBackspace={props.onBackspace} onSubmit={props.onSubmitPin} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={props.onToggleReset} style={linkBtn}>Forgot PIN? Reset PIN</button>
        {fallbackAllowed && <button type="button" onClick={props.onUsePassword} style={linkBtn}>Log in with password instead</button>}
      </div>
      {showReset && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '11px 13px', lineHeight: 1.5, marginTop: 8 }}>
          {/* TODO(backend): self-service reset will be a secure Cloud Function. */}
          <strong style={{ fontWeight: 700, color: 'var(--text-strong)' }}>Contact your admin</strong> to reset your PIN or unlock your account. Admins can reset/unlock from <em>Employee Master → Login access</em>.
        </div>
      )}
    </>
  );
}

function PortalHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
      <button type="button" onClick={onBack} aria-label="Back" style={{ ...iconBtn, flexShrink: 0 }}>
        <Icon name="chevronLeft" size={18} />
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
      </div>
    </div>
  );
}

function PinDots({ length }: { length: number }) {
  const slots = length <= 4 ? 4 : 6;
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 22 }}>
      {Array.from({ length: slots }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: i < length ? 'var(--indigo-600)' : 'transparent',
            border: `2px solid ${i < length ? 'var(--indigo-600)' : 'var(--border-default)'}`,
            transition: 'background var(--dur-fast)',
          }}
        />
      ))}
    </div>
  );
}

function PinKeypad({ disabled, canSubmit, onDigit, onBackspace, onSubmit }: { disabled: boolean; canSubmit: boolean; onDigit: (d: string) => void; onBackspace: () => void; onSubmit: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 22, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" disabled={disabled} onClick={() => onDigit(d)} style={keyStyle(disabled)}>{d}</button>
      ))}
      <button type="button" aria-label="Backspace" disabled={disabled} onClick={onBackspace} style={{ ...keyStyle(disabled), background: 'transparent', boxShadow: 'none', border: 'none' }}>
        <Icon name="chevronLeft" size={22} />
      </button>
      <button type="button" disabled={disabled} onClick={() => onDigit('0')} style={keyStyle(disabled)}>0</button>
      <button type="button" aria-label="Submit PIN" disabled={disabled || !canSubmit} onClick={onSubmit} style={{ ...keyStyle(disabled || !canSubmit), background: canSubmit && !disabled ? 'var(--indigo-600)' : 'var(--neutral-100)', color: canSubmit && !disabled ? '#fff' : 'var(--text-subtle)', border: 'none' }}>
        <Icon name="check" size={22} />
      </button>
    </div>
  );
}

/* ---------- shared bits ---------- */
function ErrorNote({ text, center }: { text: string; center?: boolean }) {
  return (
    <div role="alert" style={{ ...banner('coral'), ...(center ? { justifyContent: 'center', textAlign: 'center' } : {}) }}>
      <Icon name="alert" size={14} color="var(--coral-600)" style={{ marginTop: 1, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

function banner(tone: 'amber' | 'coral'): React.CSSProperties {
  const map = {
    amber: ['var(--amber-700)', 'var(--amber-50)', 'var(--amber-100)'],
    coral: ['var(--coral-700)', 'var(--coral-50)', 'var(--coral-100)'],
  } as const;
  const [color, bg, bd] = map[tone];
  return { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color, background: bg, border: `1px solid ${bd}`, borderRadius: 'var(--radius-md)', padding: '10px 12px' };
}

function infoBox(): React.CSSProperties {
  return { display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12, color: 'var(--indigo-700)', background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 'var(--radius-md)', padding: '11px 13px', marginTop: 16 };
}

const linkBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--indigo-600)',
  fontWeight: 600,
  fontSize: 12.5,
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'var(--font-sans)',
};

const iconBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-card)',
  color: 'var(--text-body)',
  cursor: 'pointer',
};

function keyStyle(disabled: boolean): React.CSSProperties {
  return {
    height: 60,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-strong)',
    fontSize: 22,
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-xs)',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  };
}

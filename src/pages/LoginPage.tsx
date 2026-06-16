import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, Icon, Input } from '../components/ui';
import { useAppStore } from '../store/AppStore';
import { useAuth } from '../auth/AuthProvider';
import { MAX_PIN_ATTEMPTS, verifyPinLogin } from '../lib/pinAuth';
import type { Role } from '../types';
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
  const { employees, login } = useAppStore();
  const { configured } = useAuth();

  const [role, setRole] = useState<Role>('admin');
  // Admin (Firebase) credentials
  const [email, setEmail] = useState('demo@ganguram.in');
  const [password, setPassword] = useState('demo');
  // Manager / Employee PIN credentials
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [expired] = useState(readExpiredFlag);

  const locked = attempts >= MAX_PIN_ATTEMPTS;

  const signInAdmin = () => {
    setError(null);
    // Admin keeps Firebase Auth (email/password). Demo mode signs in locally.
    if (configured) {
      navigate('/admin-login');
      return;
    }
    login({ role: 'admin', name: 'Master Admin' });
    navigate('/');
  };

  const signInPortal = (target: 'manager' | 'employee') => {
    setError(null);
    if (locked) return;
    const result = verifyPinLogin(employees, identifier, pin);
    if (!result.ok) {
      // Demo lockout: a UX placeholder — real lockout is enforced server-side.
      setAttempts((a) => a + 1);
      setError(result.message);
      return;
    }
    setAttempts(0);
    // DEMO: the PIN passed format checks only — there is no stored PIN to verify
    // against yet. TODO(backend): verify the PIN hash + sign in with a Firebase
    // custom token before creating the session.
    if (target === 'manager') {
      login({ role: 'manager', name: result.employee.name, branch: result.employee.branch, employeeId: result.employee.id });
      navigate('/manager');
    } else {
      login({ role: 'employee', name: result.employee.name, employeeId: result.employee.id });
      navigate('/portal');
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'admin') signInAdmin();
    else signInPortal(role);
  };

  const isPortal = role !== 'admin';
  const buttonLabel = role === 'admin' ? 'Sign in to admin suite' : role === 'manager' ? 'Sign in as manager' : 'Sign in to portal';

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
            <div role="alert" style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--amber-700)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-md)', padding: '11px 13px', marginBottom: 16 }}>
              <Icon name="clock" size={15} color="var(--amber-700)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sign in as</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 4 }}>
            {ROLES.map((r) => (
              <Chip key={r.id} kind="filter" active={role === r.id} icon={r.icon} onClick={() => { setRole(r.id); setError(null); setAttempts(0); setShowSetup(false); }} style={{ flex: 1, justifyContent: 'center' }}>
                {r.label}
              </Chip>
            ))}
          </div>
          <div style={{ width: 36, height: 3, borderRadius: 'var(--radius-pill)', background: 'var(--brand-accent)', marginTop: 12 }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
            {role === 'admin' ? 'Master Admin signs in with the secure Firebase email/password account.' : `${role === 'manager' ? 'Branch managers' : 'Employees'} sign in with their ID or mobile and PIN.`}
          </p>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
            {role === 'admin' ? (
              <>
                <Input label="Email / phone" value={email} onChange={(e) => setEmail(e.target.value)} icon="user" />
                <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon="lock" />
              </>
            ) : (
              <>
                <Input label="Employee / Manager ID or mobile" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError(null); }} icon="user" placeholder="e.g. GNG-BD-0142 or 98300 11422" disabled={locked} />
                <Input label={role === 'manager' ? 'PIN (6 digits recommended)' : 'PIN (4 or 6 digits)'} type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value); setError(null); }} icon="lock" placeholder="••••" disabled={locked} />
              </>
            )}

            {error && !locked && (
              <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--coral-700)', background: 'var(--coral-50)', border: '1px solid var(--coral-100)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <Icon name="alert" size={14} color="var(--coral-600)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {locked && (
              <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--coral-700)', background: 'var(--coral-50)', border: '1px solid var(--coral-100)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <Icon name="lock" size={14} color="var(--coral-600)" style={{ marginTop: 1, flexShrink: 0 }} />
                <span><strong style={{ fontWeight: 700 }}>Account locked</strong> after {MAX_PIN_ATTEMPTS} failed attempts. Please contact your admin to unlock or reset your PIN.</span>
              </div>
            )}

            <Button variant="primary" size="lg" full type="submit" disabled={isPortal && locked} iconRight={<Icon name="chevronRight" size={17} />}>
              {buttonLabel}
            </Button>
          </form>

          {isPortal && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => setShowSetup((s) => !s)} style={linkBtn}>First time? Set up your PIN</button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Forgot PIN? <span style={{ color: 'var(--indigo-600)', fontWeight: 600 }}>Contact your admin</span></span>
              </div>
              {showSetup && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '11px 13px', lineHeight: 1.5 }}>
                  {/* TODO(backend): first-time PIN setup + reset will be handled by a secure
                      Cloud Function (hash stored server-side, custom token issued). */}
                  Your admin enables portal access and sets your initial PIN. Self-service PIN
                  setup &amp; reset will arrive with the secure backend — for now, ask your admin.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12, color: 'var(--indigo-700)', background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 'var(--radius-md)', padding: '11px 13px', marginTop: 16 }}>
            <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              {role === 'admin' ? (
                <><strong style={{ fontWeight: 700 }}>Demo foundation</strong> — admin uses Firebase Auth; any credentials sign you in when Firebase is not configured.</>
              ) : (
                <><strong style={{ fontWeight: 700 }}>Demo PIN login</strong> — the PIN is checked for format and verified locally only. Secure backend PIN verification + token login is coming; no PIN is stored.</>
              )}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-subtle)', marginTop: 16 }}>Ganguram Sweets · since 1885</div>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--indigo-600)',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'var(--font-sans)',
};

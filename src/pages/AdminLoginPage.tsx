import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Input } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import logo from '../assets/ganguram-logo.png';
import gauri from '../assets/gauri-mascot.png';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { configured, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!configured) {
      navigate('/');
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate('/');
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setError(
        code.includes('invalid') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'Incorrect email or password.'
          : code.includes('too-many-requests')
            ? 'Too many attempts — try again later.'
            : (err as Error).message || 'Sign-in failed.',
      );
    } finally {
      setBusy(false);
    }
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
      <div style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-2xl)', background: 'linear-gradient(150deg, var(--indigo-600) 0%, var(--indigo-800) 62%, var(--indigo-900) 100%)', color: '#fff', padding: '22px 22px 34px', boxShadow: 'var(--shadow-brand)' }}>
          <div style={{ position: 'absolute', top: -54, right: -44, width: 184, height: 184, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,84,84,0.45) 0%, transparent 68%)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)', backgroundSize: '18px 18px', opacity: 0.5 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img src={logo} alt="Ganguram" style={{ height: 30, filter: 'brightness(0) invert(1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
              <img src={gauri} alt="Gauri" style={{ height: 80, flexShrink: 0, filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))' }} />
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--coral-300)' }}>
                  <Icon name="shield" size={13} /> Admin portal
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff', marginTop: 4 }}>Master Admin sign in</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>Secured by Firebase Authentication</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginTop: -22, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)', padding: 24 }}>
          {configured ? (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon="mail" placeholder="admin@ganguram.in" required />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon="lock" required error={error} />
              <Button variant="primary" size="lg" full type="submit" loading={busy} iconRight={busy ? undefined : <Icon name="chevronRight" size={17} />}>
                Sign in
              </Button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: 'var(--amber-700)', background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--radius-md)', padding: '11px 13px' }}>
                <Icon name="info" size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>Firebase is not configured. Add your <strong>VITE_FIREBASE_*</strong> env vars (see README) to enable secure admin login. Continuing in demo mode.</span>
              </div>
              <Button variant="primary" size="lg" full onClick={() => navigate('/')} iconRight={<Icon name="chevronRight" size={17} />}>Enter demo admin</Button>
            </div>
          )}

          <button onClick={() => navigate('/login')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 18, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', padding: 0 }}>
            <Icon name="user" size={14} /> Manager / employee login
          </button>
        </div>
      </div>
    </div>
  );
}

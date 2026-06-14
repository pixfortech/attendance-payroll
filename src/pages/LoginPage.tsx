import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Input } from '../components/ui';
import logo from '../assets/ganguram-logo.png';
import gauri from '../assets/gauri-mascot.png';

const PERKS = [
  'View attendance, salary history & slips',
  'Confirm payments you have received',
  'Request leave and track approvals',
  'See tiffin, advances & company notices',
];

export function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState('subir.m@ganguram.in');
  const [password, setPassword] = useState('demo');

  const signIn = () => navigate('/portal');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }}>
      {/* Brand panel (a permitted brand-moment gradient) */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          background: 'linear-gradient(160deg, var(--indigo-700) 0%, var(--indigo-900) 100%)',
          color: '#fff',
        }}
        className="gx-login-brand"
      >
        <img src={logo} alt="Ganguram" style={{ height: 54, width: 'auto', filter: 'brightness(0) invert(1)', alignSelf: 'flex-start' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
          <img src={gauri} alt="Gauri" style={{ height: 200, filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.35))' }} />
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>Namaste 🙏</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 8, maxWidth: 380, lineHeight: 1.5 }}>
              Welcome to your Ganguram employee portal — your salary, attendance and payments, all in one place.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {PERKS.map((p) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.92)' }}>
                <Icon name="circleCheck" size={17} color="var(--coral-400)" />
                {p}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Ganguram Sweets · since 1885</div>
      </div>

      {/* Login form */}
      <div style={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 380, maxWidth: '100%' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Employee portal</span>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.02em', marginTop: 6 }}>Sign in</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>Use your employee ID, email or phone to continue.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <Input label="Employee ID / email / phone" value={id} onChange={(e) => setId(e.target.value)} icon="user" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon="lock" />
            <Button variant="primary" full type="submit" iconRight={<Icon name="chevronRight" size={16} />}>
              Sign in to portal
            </Button>
          </form>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-inset)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '11px 13px', marginTop: 18 }}>
            <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1 }} />
            Demo foundation — any credentials open the portal as a sample employee.
          </div>

          <button
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', padding: 0 }}
          >
            <Icon name="chevronLeft" size={15} /> Back to admin suite
          </button>
        </div>
      </div>
    </div>
  );
}

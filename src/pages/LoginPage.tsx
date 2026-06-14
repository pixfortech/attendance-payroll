import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Input, type IconName } from '../components/ui';
import logo from '../assets/ganguram-logo.png';
import gauri from '../assets/gauri-mascot.png';

const TRUST_CHIPS: { label: string; icon: IconName }[] = [
  { label: 'Attendance', icon: 'calendar' },
  { label: 'Salary', icon: 'wallet' },
  { label: 'Payments', icon: 'banknote' },
  { label: 'Leave', icon: 'clock' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState('subir.m@ganguram.in');
  const [password, setPassword] = useState('demo');

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
        {/* Branded hero */}
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
          {/* Soft abstract shapes */}
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
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 4, lineHeight: 1.45 }}>Your Ganguram employee portal</p>
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

        {/* Overlapping form card */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: -22,
            background: 'var(--surface-card)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)',
            padding: 24,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Employee portal</span>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-strong)', letterSpacing: '-0.02em', marginTop: 6 }}>Sign in</h2>
          <div style={{ width: 36, height: 3, borderRadius: 'var(--radius-pill)', background: 'var(--brand-accent)', marginTop: 8 }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>Access attendance, salary, leave and payment records securely.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate('/portal');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}
          >
            <Input label="Employee ID / email / phone" value={id} onChange={(e) => setId(e.target.value)} icon="user" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon="lock" />
            <Button variant="primary" size="lg" full type="submit" iconRight={<Icon name="chevronRight" size={17} />}>Sign in to portal</Button>
          </form>

          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12, color: 'var(--indigo-700)', background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 'var(--radius-md)', padding: '11px 13px', marginTop: 16 }}>
            <Icon name="info" size={14} color="var(--indigo-500)" style={{ marginTop: 1, flexShrink: 0 }} />
            <span><strong style={{ fontWeight: 700 }}>Demo foundation</strong> — any credentials open the portal as a sample employee.</span>
          </div>
        </div>

        {/* Subtle secondary link */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', padding: '8px 10px' }}
          >
            <Icon name="chevronLeft" size={14} /> Back to admin suite
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>Ganguram Sweets · since 1885</div>
      </div>
    </div>
  );
}

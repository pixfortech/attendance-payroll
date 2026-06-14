import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { NAV_GROUPS } from './nav';
import { Avatar, Icon, IconButton, type IconName } from '../ui';
import { useAppStore } from '../../store/AppStore';
import logo from '../../assets/ganguram-logo.png';

function NavRow({ to, label, icon, end, badge, onNavigate }: { to: string; label: string; icon: IconName; end?: boolean; badge?: string; onNavigate?: () => void }) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} style={{ textDecoration: 'none' }}>
      {({ isActive }) => <NavRowInner label={label} icon={icon} active={isActive} badge={badge} />}
    </NavLink>
  );
}

function NavRowInner({ label, icon, active, badge }: { label: string; icon: IconName; active: boolean; badge?: string }) {
  const [hover, setHover] = React.useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 12px',
        minHeight: 44,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: active ? 'var(--brand-primary)' : hover ? 'var(--neutral-100)' : 'transparent',
        color: active ? '#fff' : 'var(--text-body)',
        fontWeight: active ? 600 : 500,
        fontSize: 14,
        boxShadow: active ? 'var(--shadow-brand)' : 'none',
        transition: 'background var(--dur-fast), color var(--dur-fast)',
      }}
    >
      <Icon name={icon} size={18} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '1px 7px',
            borderRadius: 'var(--radius-pill)',
            background: active ? 'rgba(255,255,255,0.22)' : 'var(--coral-50)',
            color: active ? '#fff' : 'var(--coral-600)',
          }}
        >
          {badge}
        </span>
      )}
    </span>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { employees } = useAppStore();
  const pendingSalaries = employees.filter((e) => e.payrollStatus === 'pending').length;

  return (
    <>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={logo} alt="Ganguram" style={{ height: 46, width: 'auto' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--indigo-700)', letterSpacing: '-0.02em', lineHeight: 1 }}>Ganguram</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Payroll Suite</span>
        </div>
      </div>

      <nav className="gx-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 12px 6px' }}>{group.label}</div>
            {group.items.map((item) => (
              <NavRow
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                end={item.end}
                onNavigate={onNavigate}
                badge={item.to === '/salary' && pendingSalaries > 0 ? String(pendingSalaries) : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--border-subtle)' }}>
        <NavRow to="/settings" label="Settings" icon="settings" onNavigate={onNavigate} />
        <button
          onClick={() => { onNavigate?.(); navigate('/portal'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', minHeight: 44, width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-body)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-md)' }}
        >
          <Icon name="user" size={18} /> <span style={{ flex: 1, textAlign: 'left' }}>Employee portal</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', marginTop: 4 }}>
          <Avatar name="Indrajit Pal" size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Indrajit Pal</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Owner · Admin</div>
          </div>
          <IconButton icon="logout" label="Sign out" size="sm" onClick={() => navigate('/login')} />
        </div>
      </div>
    </>
  );
}

export function Sidebar({ isMobile, open, onClose }: { isMobile: boolean; open: boolean; onClose: () => void }) {
  if (isMobile) {
    return (
      <>
        {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,34,0.5)', backdropFilter: 'blur(2px)', zIndex: 70 }} />}
        <aside
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100%',
            width: 272,
            maxWidth: '85vw',
            background: 'var(--surface-card)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform var(--dur-base) var(--ease-out)',
            zIndex: 71,
            boxShadow: open ? 'var(--shadow-xl)' : 'none',
          }}
        >
          <SidebarContent onNavigate={onClose} />
        </aside>
      </>
    );
  }

  return (
    <aside style={{ width: 256, flexShrink: 0, height: '100%', background: 'var(--surface-card)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
      <SidebarContent />
    </aside>
  );
}

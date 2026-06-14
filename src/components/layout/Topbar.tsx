import { useNavigate } from 'react-router-dom';
import { Button, Icon, IconButton } from '../ui';
import { CURRENT_MONTH } from '../../data';
import { useIsMobile } from '../../hooks/useMediaQuery';

export function Topbar({ title, subtitle, onMenu }: { title: string; subtitle?: string; onMenu: () => void }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 10 : 16,
        padding: isMobile ? '0 14px' : '0 28px',
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {isMobile && <IconButton icon="panelLeft" label="Open menu" variant="secondary" onClick={onMenu} />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: isMobile ? 16 : 19, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        {subtitle && !isMobile && <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
      </div>

      {!isMobile && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', height: 40, gap: 8, padding: '0 12px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', width: 240 }}>
            <Icon name="search" size={16} color="var(--text-subtle)" />
            <input placeholder="Search employee, branch…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-body)', minWidth: 0 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: 40, gap: 8, padding: '0 14px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>
            <Icon name="calendar" size={16} color="var(--indigo-600)" />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{CURRENT_MONTH.label}</span>
            <Icon name="chevronDown" size={15} color="var(--text-muted)" />
          </div>

          <Button variant="tonal" size="sm" iconLeft={<Icon name="user" size={15} />} onClick={() => navigate('/portal')} style={{ whiteSpace: 'nowrap' }}>
            Employee portal
          </Button>
        </>
      )}

      <div style={{ position: 'relative' }}>
        <IconButton icon="bell" label="Notifications" variant="secondary" />
        <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--coral-500)', border: '2px solid var(--surface-card)' }} />
      </div>
    </header>
  );
}

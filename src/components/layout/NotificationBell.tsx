import { useState } from 'react';
import { Icon, IconButton, type IconName } from '../ui';
import { useAppStore } from '../../store/AppStore';
import type { NotificationType, Role } from '../../types';

const TYPE_ICON: Record<NotificationType, IconName> = {
  salary_requested: 'wallet',
  salary_approved: 'badgeCheck',
  salary_hold: 'alert',
  salary_paid: 'wallet',
  payment_requested: 'wallet',
  payment_confirmed: 'circleCheck',
  payment_disputed: 'alert',
  leave_approved: 'calendar',
  leave_rejected: 'calendar',
  attendance_approved: 'shield',
  attendance_correction: 'calendar',
  advance_added: 'banknote',
  advance_adjusted: 'banknote',
  admin_override: 'shield',
  portal_access: 'lock',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function NotificationBell({ viewer }: { viewer: { role?: Role; employeeId?: string } }) {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [open, setOpen] = useState(false);

  const mine = notifications.filter((n) => (viewer.role && n.recipient.role === viewer.role) || (viewer.employeeId && n.recipient.employeeId === viewer.employeeId));
  const unread = mine.filter((n) => !n.read).length;

  return (
    <div style={{ position: 'relative' }}>
      <IconButton icon="bell" label="Notifications" variant="secondary" onClick={() => setOpen((o) => !o)} />
      {unread > 0 && (
        <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 'var(--radius-pill)', background: 'var(--coral-500)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface-card)' }}>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div
            className="gx-scroll"
            style={{ position: 'absolute', right: 0, top: 46, width: 330, maxWidth: '92vw', maxHeight: 420, overflowY: 'auto', background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', zIndex: 91 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--surface-card)' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>Notifications</span>
              {unread > 0 && (
                <button onClick={() => markAllNotificationsRead(viewer)} style={{ border: 'none', background: 'transparent', color: 'var(--indigo-600)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Mark all read</button>
              )}
            </div>
            {mine.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {mine.slice(0, 30).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)', background: n.read ? 'transparent' : 'var(--indigo-50)', border: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'var(--font-sans)' }}
                  >
                    <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={TYPE_ICON[n.type]} size={16} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>{n.title}</span>
                        {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--coral-500)' }} />}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{n.message}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-subtle)', marginTop: 3 }}>{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

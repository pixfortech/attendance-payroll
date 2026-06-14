import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getPageMeta } from './nav';
import { useIsMobile } from '../../hooks/useMediaQuery';

export function AdminLayout() {
  const { pathname } = useLocation();
  const meta = getPageMeta(pathname);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div style={{ display: 'flex', height: '100vh', maxWidth: '100%', background: 'var(--surface-page)' }}>
      <Sidebar isMobile={isMobile} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={meta.title} subtitle={meta.sub} onMenu={() => setDrawerOpen(true)} />
        <main className="gx-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '16px 14px 32px' : '24px 28px 40px' }}>
          <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

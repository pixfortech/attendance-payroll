import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getPageMeta } from './nav';

export function AdminLayout() {
  const { pathname } = useLocation();
  const meta = getPageMeta(pathname);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-page)' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={meta.title} subtitle={meta.sub} />
        <main className="gx-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
          <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider, ConfirmProvider } from './components/ui';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeeMasterPage } from './pages/EmployeeMasterPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { BranchesPage } from './pages/BranchesPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavePage } from './pages/LeavePage';
import { TiffinPage } from './pages/TiffinPage';
import { SalaryPage } from './pages/SalaryPage';
import { AdvancesPage } from './pages/AdvancesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { FormulaBuilderPage } from './pages/FormulaBuilderPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { KioskPage } from './pages/KioskPage';
import { PortalPage } from './pages/portal/PortalPage';
import { ManagerPortal } from './pages/manager/ManagerPortal';

function AuthSplash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--indigo-300)', borderTopColor: 'transparent', display: 'inline-block', animation: 'gx-spin 0.7s linear infinite', marginRight: 10 }} />
      Loading…
    </div>
  );
}

/** Admin suite — login-first; requires Firebase Auth (when configured). */
function AdminRoute() {
  const { session } = useAppStore();
  const { adminAuthed, loading } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'employee') return <Navigate to="/portal" replace />;
  if (session.role === 'manager') return <Navigate to="/manager" replace />;
  if (loading) return <AuthSplash />;
  if (!adminAuthed) return <Navigate to="/admin-login" replace />;
  return <AdminLayout />;
}

/** Manager portal — admins may view it too; employees are sent to their portal. */
function ManagerRoute() {
  const { session } = useAppStore();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role === 'employee') return <Navigate to="/portal" replace />;
  return <ManagerPortal />;
}

/** Employee portal — login-first. */
function PortalRoute() {
  const { session } = useAppStore();
  if (!session) return <Navigate to="/login" replace />;
  return <PortalPage />;
}

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <AppStoreProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route element={<AdminRoute />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/employees" element={<EmployeeMasterPage />} />
                  <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                  <Route path="/branches" element={<BranchesPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/leaves" element={<LeavePage />} />
                  <Route path="/tiffin" element={<TiffinPage />} />
                  <Route path="/salary" element={<SalaryPage />} />
                  <Route path="/advances" element={<AdvancesPage />} />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/formula" element={<FormulaBuilderPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/audit" element={<AuditLogPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="/manager" element={<ManagerRoute />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin-login" element={<AdminLoginPage />} />
                <Route path="/kiosk" element={<KioskPage />} />
                <Route path="/portal" element={<PortalRoute />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AppStoreProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

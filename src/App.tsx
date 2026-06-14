import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider, ConfirmProvider } from './components/ui';
import { AppStoreProvider, useAppStore } from './store/AppStore';
import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeeMasterPage } from './pages/EmployeeMasterPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { BranchesPage } from './pages/BranchesPage';
import { AttendancePage } from './pages/AttendancePage';
import { TiffinPage } from './pages/TiffinPage';
import { SalaryPage } from './pages/SalaryPage';
import { AdvancesPage } from './pages/AdvancesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { FormulaBuilderPage } from './pages/FormulaBuilderPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { LoginPage } from './pages/LoginPage';
import { KioskPage } from './pages/KioskPage';
import { PortalPage } from './pages/portal/PortalPage';
import { ManagerPortal } from './pages/manager/ManagerPortal';

/** Admin suite — managers/employees are routed to their own portals. */
function AdminRoute() {
  const { session } = useAppStore();
  if (session.role === 'employee') return <Navigate to="/portal" replace />;
  if (session.role === 'manager') return <Navigate to="/manager" replace />;
  return <AdminLayout />;
}

/** Manager portal — admins may view it too; employees are sent to their portal. */
function ManagerRoute() {
  const { session } = useAppStore();
  if (session.role === 'employee') return <Navigate to="/portal" replace />;
  return <ManagerPortal />;
}

export function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AppStoreProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route element={<AdminRoute />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/employees" element={<EmployeeMasterPage />} />
                <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
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
              <Route path="/kiosk" element={<KioskPage />} />
              <Route path="/portal" element={<PortalPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AppStoreProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

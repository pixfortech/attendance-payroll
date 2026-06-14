import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from './store/AppStore';
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
import { LoginPage } from './pages/LoginPage';
import { PortalPage } from './pages/portal/PortalPage';

export function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AdminLayout />}>
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
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<PortalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppStoreProvider>
  );
}

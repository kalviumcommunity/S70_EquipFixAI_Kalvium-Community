import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ToastProvider } from './components/common/ToastContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ManagerDashboard } from './pages/dashboards/ManagerDashboard';
import { SupervisorDashboard } from './pages/dashboards/SupervisorDashboard';
import { TechnicianDashboard } from './pages/dashboards/TechnicianDashboard';
import { OperatorDashboard } from './pages/dashboards/OperatorDashboard';
import { MachinesPage } from './pages/MachinesPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { SchedulesPage } from './pages/SchedulesPage';
import { PartsPage } from './pages/PartsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UsersPage } from './pages/UsersPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';

const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  const role = (user?.role?.name || user?.role || '').toUpperCase();

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to default dashboard for this user
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main Protected Application Shell Layout
const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#070c18',
        color: '#f8fafc',
        gap: '16px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3px solid #1e293b',
          borderTopColor: '#2563eb',
          animation: 'spin 0.75s linear infinite'
        }} />
        <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          Authenticating Station Credentials...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = (user?.role?.name || user?.role || '').toUpperCase();
  const getRoleDashboardRedirect = () => {
    switch (role) {
      case 'MANAGER': return '/manager/dashboard';
      case 'SUPERVISOR': return '/supervisor/dashboard';
      case 'TECHNICIAN': return '/technician/dashboard';
      default: return '/labor/dashboard';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="app-container" style={{ height: '100vh' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="main-content">
          <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          <Routes>
            {/* Automatic role redirection for /dashboard */}
            <Route path="/dashboard" element={<Navigate to={getRoleDashboardRedirect()} replace />} />

            {/* Role-Specific Dashboards */}
            <Route
              path="/manager/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['MANAGER']}>
                  <ManagerDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/supervisor/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['SUPERVISOR', 'MANAGER']}>
                  <SupervisorDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/technician/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={['TECHNICIAN', 'SUPERVISOR', 'MANAGER']}>
                  <TechnicianDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route path="/labor/dashboard" element={<OperatorDashboard />} />
            <Route path="/operator/dashboard" element={<Navigate to="/labor/dashboard" replace />} />

            {/* Operational Management Pages */}
            <Route path="/machines" element={<MachinesPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route
              path="/schedules"
              element={
                <RoleProtectedRoute allowedRoles={['SUPERVISOR', 'MANAGER']}>
                  <SchedulesPage />
                </RoleProtectedRoute>
              }
            />
            <Route path="/parts" element={<PartsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route
              path="/audit-logs"
              element={
                <RoleProtectedRoute allowedRoles={['SUPERVISOR', 'MANAGER']}>
                  <AuditLogsPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <RoleProtectedRoute allowedRoles={['SUPERVISOR', 'MANAGER']}>
                  <UsersPage />
                </RoleProtectedRoute>
              }
            />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <WebSocketProvider>
              <Routes>
                {/* Public Unauthenticated Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected Operational Application Shell */}
                <Route path="/*" element={<ProtectedLayout />} />
              </Routes>
            </WebSocketProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;

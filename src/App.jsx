import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector('.main-content')?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { IntegrationProvider } from './context/IntegrationContext';
import { UserProvider } from './context/UserContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';
import ManagePage from './pages/ManagePage';
import AccountAuditPage from './pages/AccountAuditPage';
import SecurityPage from './pages/SecurityPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16, color: '#5f6368' }}>
        로딩 중...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return (
    <UserProvider>
      <IntegrationProvider>
        <div className="layout">
          <Sidebar />
          <div className="content-area">
            <TopBar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/manage" element={<ManagePage />} />
                <Route path="/audit" element={<AccountAuditPage />} />
                <Route path="/security" element={<SecurityPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </IntegrationProvider>
    </UserProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<LoginRouteGuard />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginRouteGuard() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <LoginPage />;
}

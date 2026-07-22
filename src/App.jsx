import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import IntegrationPage from './pages/IntegrationPage';
import QuotaControlPage from './pages/QuotaControlPage';
import AccountAuditPage from './pages/AccountAuditPage';
import RoutingPolicyPage from './pages/RoutingPolicyPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProvisioningPage from './pages/ProvisioningPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <div className="content-area">
          <TopBar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/integration" replace />} />
              <Route path="/integration" element={<IntegrationPage />} />
              <Route path="/quota" element={<QuotaControlPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/audit" element={<AccountAuditPage />} />
              <Route path="/routing" element={<RoutingPolicyPage />} />
              <Route path="/provisioning" element={<ProvisioningPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

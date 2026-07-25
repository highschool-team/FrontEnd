import { useState } from 'react';
import IntegrationPage from './IntegrationPage';
import ProvisioningPage from './ProvisioningPage';

const TABS = [
  { key: 'integration',  label: '연동 관리' },
  { key: 'provisioning', label: '프로비저닝' },
];

export default function ManagePage() {
  const [tab, setTab] = useState('integration');

  return (
    <div>
      <div className="manage-tab-bar">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`manage-tab-btn ${tab === t.key ? 'manage-tab-btn--active' : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>
      {tab === 'integration' ? <IntegrationPage /> : <ProvisioningPage />}
    </div>
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { useUser, MOCK_USERS, ROLE_TABS } from '../context/UserContext';

const PAGE_TITLES = {
  '/integration': '연동 관리',
  '/quota':       'API 할당 제어',
  '/analytics':   '사용량 분석',
  '/audit':       '계정 오딧',
  '/routing':     '라우팅 정책',
  '/provisioning':'프로비저닝',
  '/security':    '보안 모니터링',
};

const ROLE_COLOR = {
  techlead: { bg: '#e8f0fe', color: '#1a73e8' },
  partlead: { bg: '#e6f4ea', color: '#34a853' },
  member:   { bg: '#fef3c7', color: '#92400e' },
  devops:   { bg: '#fce8e6', color: '#ea4335' },
};

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { user, switchRole } = useUser();

  const title = PAGE_TITLES[pathname] ?? '';
  const rc    = ROLE_COLOR[user.role];

  const handleRoleChange = (role) => {
    switchRole(role);
    const firstTab = ROLE_TABS[role][0];
    navigate(`/${firstTab}`);
  };

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="topbar-icon">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>

        {/* 역할 전환 (데모용) */}
        <div className="role-switcher">
          <span className="role-badge" style={{ background: rc.bg, color: rc.color }}>
            {user.roleLabel}
          </span>
          <select
            className="role-select"
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            {Object.values(MOCK_USERS).map((u) => (
              <option key={u.role} value={u.role}>
                {u.name} ({u.roleLabel})
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="role-chevron">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </div>
  );
}

import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/integration': '연동 관리',
  '/quota': 'API 할당 제어',
  '/analytics': '사용량 분석',
  '/audit': '계정 오딧',
  '/routing': '라우팅 정책',
  '/provisioning': '프로비저닝',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? '';

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="topbar-icon">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <div className="topbar-user-circle" />
      </div>
    </div>
  );
}

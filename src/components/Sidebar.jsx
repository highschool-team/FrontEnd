import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUser, ROLE_TABS } from '../context/UserContext';

const PlugIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
const GaugeIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 6v6l4 2" /><circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" /></svg>;
const ChartIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const ShieldIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>;
const RouteIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 012 2v7" /><path d="M11 18H8a2 2 0 01-2-2V9" /></svg>;
const UsersIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
const SecurityIcon= () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;

const ALL_NAV = [
  { id: 'integration', to: '/integration', label: '연동 관리',      Icon: PlugIcon     },
  { id: 'quota',       to: '/quota',       label: 'API 할당 제어',  Icon: GaugeIcon    },
  { id: 'analytics',  to: '/analytics',   label: '분석',            Icon: ChartIcon    },
  { id: 'audit',      to: '/audit',       label: '계정 오딧',       Icon: ShieldIcon   },
  { id: 'routing',    to: '/routing',     label: '라우팅 정책',     Icon: RouteIcon    },
  { id: 'provisioning',to:'/provisioning',label: '프로비저닝',      Icon: UsersIcon    },
  { id: 'security',   to: '/security',    label: '보안 모니터링',   Icon: SecurityIcon },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const navigate  = useNavigate();

  const allowed  = ROLE_TABS[user.role];
  const navItems = ALL_NAV.filter((n) => allowed.includes(n.id));

  const handleToggle = () => {
    setIsOpen((p) => {
      if (p) return false;
      // 열릴 때 접근 불가 페이지면 첫 허용 탭으로 이동
      return true;
    });
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar-header">
        <button
          className={`hamburger ${isOpen ? 'hamburger--active' : ''}`}
          onClick={handleToggle}
          aria-label="메뉴 토글"
        >
          <span /><span /><span />
        </button>
        {isOpen && <span className="service-name">FinOps Guard</span>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ id, to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isOpen ? 'nav-item--expanded' : ''} ${isActive ? 'nav-item--active' : ''}`
            }
          >
            <Icon />
            {isOpen && <span className="nav-label">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

import { useState } from 'react';

const providers = [
  {
    id: 'google', name: 'Google Workspace', desc: '사용자 계정·라이선스 오딧', color: '#4285f4',
    logo: 'G', connected: true,
  },
  {
    id: 'slack', name: 'Slack', desc: '채널 멤버·플랜 등급 관리', color: '#4a154b',
    logo: 'S', connected: true,
  },
  {
    id: 'figma', name: 'Figma', desc: '파일 소유권·좌석 관리', color: '#f24e1e',
    logo: 'F', connected: true,
  },
  {
    id: 'github', name: 'GitHub', desc: '리포지토리·시트 라이선스', color: '#24292e',
    logo: 'GH', connected: false,
  },
  {
    id: 'openai', name: 'OpenAI', desc: 'API 사용량·비용 할당 제어', color: '#10a37f',
    logo: 'OA', connected: false,
  },
  {
    id: 'claude', name: 'Anthropic / Claude', desc: 'API 사용량·비용 할당 제어', color: '#d97757',
    logo: 'AC', connected: false,
  },
];

export default function IntegrationPage() {
  const [states, setStates] = useState(
    Object.fromEntries(providers.map((p) => [p.id, p.connected]))
  );
  const [loading, setLoading] = useState({});

  const toggle = (id) => {
    setLoading((p) => ({ ...p, [id]: true }));
    setTimeout(() => {
      setStates((p) => ({ ...p, [id]: !p[id] }));
      setLoading((p) => ({ ...p, [id]: false }));
    }, 1200);
  };

  const connected = Object.values(states).filter(Boolean).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">연동 관리</h1>
          <p className="page-sub">SaaS 및 AI API 제공사를 연결해 통합 모니터링을 시작하세요</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value green">{connected}</span>
          <span className="stat-label">연동된 서비스</span>
        </div>
        <div className="stat-card">
          <span className="stat-value gray">{providers.length - connected}</span>
          <span className="stat-label">미연동 서비스</span>
        </div>
        <div className="stat-card">
          <span className="stat-value blue">156</span>
          <span className="stat-label">모니터링 중인 계정</span>
        </div>
      </div>

      <div className="provider-grid">
        {providers.map((p) => {
          const isConnected = states[p.id];
          const isLoading = loading[p.id];
          return (
            <div key={p.id} className={`provider-card ${isConnected ? 'provider-card--connected' : ''}`}>
              <div className="provider-card-top">
                <div className="provider-logo" style={{ background: p.color }}>
                  {p.logo}
                </div>
                <span className={`provider-badge ${isConnected ? 'badge--green' : 'badge--gray'}`}>
                  {isConnected ? '● 연동됨' : '○ 미연동'}
                </span>
              </div>
              <h3 className="provider-name">{p.name}</h3>
              <p className="provider-desc">{p.desc}</p>
              <button
                className={`provider-btn ${isConnected ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => toggle(p.id)}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : isConnected ? '연동 해제' : '연동하기'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

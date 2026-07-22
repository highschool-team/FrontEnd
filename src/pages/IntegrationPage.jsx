import { useState } from 'react';

/* ── 전체 카탈로그 ── */
const CATALOG = [
  { id: 'google',      name: 'Google Workspace', desc: '사용자 계정·라이선스 오딧',      color: '#4285f4', logo: 'G',   category: 'saas' },
  { id: 'slack',       name: 'Slack',             desc: '채널 멤버·플랜 등급 관리',       color: '#4a154b', logo: 'S',   category: 'saas' },
  { id: 'figma',       name: 'Figma',             desc: '파일 소유권·좌석 관리',          color: '#f24e1e', logo: 'F',   category: 'saas' },
  { id: 'notion',      name: 'Notion',            desc: '워크스페이스 멤버·플랜 관리',    color: '#000',    logo: 'N',   category: 'saas' },
  { id: 'zoom',        name: 'Zoom',              desc: '라이선스·호스트 계정 관리',      color: '#2d8cff', logo: 'Z',   category: 'saas' },
  { id: 'salesforce',  name: 'Salesforce',        desc: 'CRM 사용자·라이선스 관리',       color: '#00a1e0', logo: 'SF',  category: 'saas' },
  { id: 'hubspot',     name: 'HubSpot',           desc: '마케팅·세일즈 시트 관리',        color: '#ff7a59', logo: 'HS',  category: 'saas' },
  { id: 'github',      name: 'GitHub',            desc: '리포지토리·시트 라이선스',       color: '#24292e', logo: 'GH',  category: 'dev'  },
  { id: 'jira',        name: 'Jira',              desc: '프로젝트 멤버·라이선스 관리',    color: '#0052cc', logo: 'J',   category: 'dev'  },
  { id: 'confluence',  name: 'Confluence',        desc: '문서 워크스페이스 멤버 관리',    color: '#0052cc', logo: 'CF',  category: 'dev'  },
  { id: 'datadog',     name: 'Datadog',           desc: '모니터링·좌석 라이선스 관리',    color: '#632ca6', logo: 'DD',  category: 'dev'  },
  { id: 'openai',      name: 'OpenAI',            desc: 'API 사용량·비용 할당 제어',      color: '#10a37f', logo: 'OA',  category: 'ai'   },
  { id: 'claude',      name: 'Anthropic / Claude',desc: 'API 사용량·비용 할당 제어',      color: '#d97757', logo: 'AC',  category: 'ai'   },
  { id: 'gemini',      name: 'Google Gemini',     desc: 'API 사용량·비용 할당 제어',      color: '#7c3aed', logo: 'GM',  category: 'ai'   },
  { id: 'mistral',     name: 'Mistral AI',        desc: 'API 사용량·비용 할당 제어',      color: '#ff6b35', logo: 'MS',  category: 'ai'   },
  { id: 'cohere',      name: 'Cohere',            desc: 'API 사용량·비용 할당 제어',      color: '#39594d', logo: 'CO',  category: 'ai'   },
];

const CATEGORY_LABEL = { ai: 'AI API', saas: 'SaaS', dev: '개발 도구' };

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'ai',  label: 'AI API' },
  { key: 'saas',label: 'SaaS' },
  { key: 'dev', label: '개발 도구' },
];

const DEFAULT_ADDED = new Set(['google', 'slack', 'figma', 'notion', 'github', 'jira', 'openai', 'claude', 'gemini']);

export default function IntegrationPage() {
  const [added, setAdded]         = useState(DEFAULT_ADDED);
  const [connected, setConnected] = useState(new Set(['google', 'slack', 'figma']));
  const [loading, setLoading]     = useState(new Set());
  const [category, setCategory]   = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalCat, setModalCat]   = useState('all');

  /* 연동 토글 */
  const toggle = (id) => {
    setLoading((p) => new Set([...p, id]));
    setTimeout(() => {
      setConnected((p) => {
        const n = new Set(p);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
      });
      setLoading((p) => { const n = new Set(p); n.delete(id); return n; });
    }, 1200);
  };

  /* 카드 삭제 */
  const remove = (id) => {
    setAdded((p) => { const n = new Set(p); n.delete(id); return n; });
    setConnected((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  /* 카탈로그에서 추가 */
  const addFromCatalog = (id) => {
    setAdded((p) => new Set([...p, id]));
  };

  const addedList    = CATALOG.filter((p) => added.has(p.id));
  const catalogList  = CATALOG.filter((p) => !added.has(p.id));

  const visibleAdded = addedList.filter((p) => category === 'all' || p.category === category);
  const visibleCatalog = catalogList.filter((p) => modalCat === 'all' || p.category === modalCat);

  const countAdded = (key) =>
    key === 'all' ? addedList.length : addedList.filter((p) => p.category === key).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">연동 관리</h1>
          <p className="page-sub">SaaS 및 AI API 제공사를 연결해 통합 모니터링을 시작하세요</p>
        </div>
        <button className="sim-btn" onClick={() => setShowModal(true)}>
          + 서비스 추가
        </button>
      </div>

      {/* 스탯 */}
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value blue">{addedList.length}</span>
          <span className="stat-label">등록된 서비스</span>
        </div>
        <div className="stat-card">
          <span className="stat-value green">{connected.size}</span>
          <span className="stat-label">연동됨</span>
        </div>
        <div className="stat-card">
          <span className="stat-value blue">
            {addedList.filter((p) => p.category === 'ai' && connected.has(p.id)).length}
            &nbsp;/&nbsp;
            {addedList.filter((p) => p.category === 'ai').length}
          </span>
          <span className="stat-label">AI API</span>
        </div>
        <div className="stat-card">
          <span className="stat-value orange">
            {addedList.filter((p) => p.category === 'saas' && connected.has(p.id)).length}
            &nbsp;/&nbsp;
            {addedList.filter((p) => p.category === 'saas').length}
          </span>
          <span className="stat-label">SaaS</span>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="integration-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`integration-tab ${category === t.key ? 'integration-tab--active' : ''}`}
            onClick={() => setCategory(t.key)}
          >
            {t.label}
            <span className="integration-tab-count">{countAdded(t.key)}</span>
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="provider-grid">
        {visibleAdded.map((p) => {
          const isConnected = connected.has(p.id);
          const isLoading   = loading.has(p.id);
          return (
            <div key={p.id} className={`provider-card ${isConnected ? 'provider-card--connected' : ''}`}>
              <div className="provider-card-top">
                <div className="provider-logo" style={{ background: p.color }}>{p.logo}</div>
                <div className="provider-card-top-right">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`provider-category-badge cat--${p.category}`}>
                      {CATEGORY_LABEL[p.category]}
                    </span>
                    <button
                      className="card-remove-btn"
                      onClick={() => remove(p.id)}
                      title="목록에서 제거"
                    >
                      ×
                    </button>
                  </div>
                  <span className={`provider-badge ${isConnected ? 'badge--green' : 'badge--gray'}`}>
                    {isConnected ? '● 연동됨' : '○ 미연동'}
                  </span>
                </div>
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

        {/* + 추가 카드 */}
        <button className="provider-add-card" onClick={() => setShowModal(true)}>
          <span className="provider-add-icon">+</span>
          <span className="provider-add-label">서비스 추가</span>
        </button>
      </div>

      {/* ── 추가 모달 ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">서비스 추가</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {/* 모달 카테고리 탭 */}
            <div className="integration-tabs" style={{ marginBottom: 20 }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`integration-tab ${modalCat === t.key ? 'integration-tab--active' : ''}`}
                  onClick={() => setModalCat(t.key)}
                >
                  {t.label}
                  <span className="integration-tab-count">
                    {t.key === 'all'
                      ? catalogList.length
                      : catalogList.filter((p) => p.category === t.key).length}
                  </span>
                </button>
              ))}
            </div>

            {visibleCatalog.length === 0 ? (
              <div className="modal-empty">
                {catalogList.length === 0
                  ? '카탈로그의 모든 서비스가 이미 추가되었습니다.'
                  : '해당 카테고리에 추가할 서비스가 없습니다.'}
              </div>
            ) : (
              <div className="catalog-grid">
                {visibleCatalog.map((p) => (
                  <div key={p.id} className="catalog-card">
                    <div className="catalog-card-left">
                      <div className="provider-logo" style={{ background: p.color, width: 36, height: 36, fontSize: 12 }}>
                        {p.logo}
                      </div>
                      <div>
                        <p className="catalog-name">{p.name}</p>
                        <p className="catalog-desc">{p.desc}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`provider-category-badge cat--${p.category}`}>
                        {CATEGORY_LABEL[p.category]}
                      </span>
                      <button
                        className="catalog-add-btn"
                        onClick={() => { addFromCatalog(p.id); }}
                      >
                        추가
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

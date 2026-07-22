import { useState } from 'react';
import { useIntegration } from '../context/IntegrationContext';

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
  { key: 'all',  label: '전체' },
  { key: 'ai',   label: 'AI API' },
  { key: 'saas', label: 'SaaS' },
  { key: 'dev',  label: '개발 도구' },
];

/* ── AI API Key 힌트 ── */
const API_KEY_HINTS = {
  openai:  { prefix: 'sk-',           placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx',        minLen: 20, doc: 'platform.openai.com → API Keys' },
  claude:  { prefix: 'sk-ant-',       placeholder: 'sk-ant-api03-xxxxxxxxxxxxxxxxxx',        minLen: 20, doc: 'console.anthropic.com → API Keys' },
  gemini:  { prefix: 'AIzaSy',        placeholder: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX',   minLen: 20, doc: 'aistudio.google.com → Get API key' },
  mistral: { prefix: '',              placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',        minLen: 16, doc: 'console.mistral.ai → API Keys' },
  cohere:  { prefix: '',              placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', minLen: 16, doc: 'dashboard.cohere.com → API Keys' },
};

/* ── API Key 등록 팝업 ── */
function ApiKeyModal({ target, onSubmit, onCancel }) {
  const { provider, step } = target;
  const hint = API_KEY_HINTS[provider.id] ?? { placeholder: 'API Key를 입력하세요', minLen: 16, doc: '' };
  const [key, setKey]     = useState('');
  const [show, setShow]   = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (key.trim().length < hint.minLen) {
      setError('유효하지 않은 API Key 형식입니다. 다시 확인해주세요.');
      return;
    }
    setError('');
    onSubmit(key.trim());
  };

  return (
    <div className="modal-overlay" onClick={step === 'input' ? onCancel : undefined}>
      <div className="oauth-modal" onClick={(e) => e.stopPropagation()}>

        {step === 'input' && (
          <>
            <div className="oauth-header">
              <div className="oauth-app-row">
                <div className="oauth-finops-logo">FG</div>
                <div className="oauth-connect-arrows">
                  <svg viewBox="0 0 40 16" fill="none" width="40" height="16">
                    <path d="M0 8 L14 8 M26 8 L40 8" stroke="#c5cae9" strokeWidth="1.5" />
                    <circle cx="20" cy="8" r="4" fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1.5" />
                    <path d="M18 8 L20 10 L22 8" stroke="#1a73e8" strokeWidth="1.2" fill="none" />
                    <path d="M22 8 L20 6 L18 8" stroke="#1a73e8" strokeWidth="1.2" fill="none" />
                  </svg>
                </div>
                <div className="provider-logo" style={{ background: provider.color, width: 48, height: 48, fontSize: 14 }}>
                  {provider.logo}
                </div>
              </div>
              <h2 className="oauth-title">
                <span style={{ color: provider.color }}>{provider.name}</span><br />
                <strong>API Key 등록</strong>
              </h2>
              <p className="oauth-subtitle">
                발급받은 API Key를 등록하면 FinOps Guard에서<br />사용량과 비용을 실시간으로 모니터링합니다
              </p>
            </div>

            <div style={{ padding: '20px 28px' }}>
              <label className="apikey-label">API Key</label>
              <div className="apikey-input-wrap">
                <input
                  className={`apikey-input ${error ? 'apikey-input--error' : ''}`}
                  type={show ? 'text' : 'password'}
                  placeholder={hint.placeholder}
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  autoFocus
                  spellCheck={false}
                />
                <button className="apikey-toggle" onClick={() => setShow((p) => !p)} tabIndex={-1}>
                  {show ? '숨김' : '표시'}
                </button>
              </div>
              {error && <p className="apikey-error">{error}</p>}
              {hint.doc && (
                <p className="apikey-hint">
                  🔑 Key 발급 위치: <span style={{ color: '#1a73e8' }}>{hint.doc}</span>
                </p>
              )}
            </div>

            <div className="oauth-actions">
              <button className="oauth-cancel-btn" onClick={onCancel}>취소</button>
              <button
                className="oauth-allow-btn"
                style={{ background: provider.color }}
                onClick={handleSubmit}
                disabled={!key.trim()}
              >
                등록 및 연동
              </button>
            </div>
            <p className="oauth-notice">API Key는 암호화되어 저장되며 외부로 노출되지 않습니다</p>
          </>
        )}

        {step === 'validating' && (
          <div className="oauth-status-wrap">
            <div className="oauth-spinner" style={{ borderTopColor: provider.color }} />
            <div className="provider-logo" style={{ background: provider.color, width: 44, height: 44, fontSize: 13, margin: '0 auto' }}>
              {provider.logo}
            </div>
            <p className="oauth-status-title">API Key 검증 중...</p>
            <p className="oauth-status-sub">{provider.name} 서버에 연결을 확인하고 있습니다</p>
          </div>
        )}

        {step === 'done' && (
          <div className="oauth-status-wrap">
            <div className="oauth-done-ring" style={{ borderColor: provider.color }}>
              <span className="oauth-done-check" style={{ color: provider.color }}>✓</span>
            </div>
            <p className="oauth-status-title">연동 완료!</p>
            <p className="oauth-status-sub">{provider.name} API Key가 성공적으로 등록되었습니다</p>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── OAuth 권한 범위 (SaaS / 개발 도구) ── */
const OAUTH_PERMS = {
  saas: [
    { icon: '👥', text: '조직 구성원 목록 읽기' },
    { icon: '🎫', text: '라이선스 및 시트 정보 접근' },
    { icon: '📋', text: '계정 활동 로그 조회' },
    { icon: '🔔', text: '비활성 계정 알림 수신' },
  ],
  dev: [
    { icon: '🗂️', text: '리포지토리 및 프로젝트 목록 읽기' },
    { icon: '👤', text: '팀 멤버 및 권한 정보 접근' },
    { icon: '🎫', text: '시트 라이선스 사용 현황 관리' },
    { icon: '📋', text: '접근 로그 및 감사 기록 조회' },
  ],
};

/* ── OAuth 팝업 컴포넌트 ── */
function OAuthModal({ target, onAllow, onCancel }) {
  const { provider, step } = target;
  const perms = OAUTH_PERMS[provider.category] ?? OAUTH_PERMS.saas;

  return (
    <div className="modal-overlay" onClick={step === 'consent' ? onCancel : undefined}>
      <div className="oauth-modal" onClick={(e) => e.stopPropagation()}>

        {step === 'consent' && (
          <>
            {/* 앱 연결 헤더 */}
            <div className="oauth-header">
              <div className="oauth-app-row">
                <div className="oauth-finops-logo">FG</div>
                <div className="oauth-connect-arrows">
                  <svg viewBox="0 0 40 16" fill="none" width="40" height="16">
                    <path d="M0 8 L14 8 M26 8 L40 8" stroke="#c5cae9" strokeWidth="1.5" />
                    <circle cx="20" cy="8" r="4" fill="#e8f0fe" stroke="#1a73e8" strokeWidth="1.5" />
                    <path d="M18 8 L20 10 L22 8" stroke="#1a73e8" strokeWidth="1.2" fill="none" />
                    <path d="M22 8 L20 6 L18 8" stroke="#1a73e8" strokeWidth="1.2" fill="none" />
                  </svg>
                </div>
                <div className="provider-logo" style={{ background: provider.color, width: 48, height: 48, fontSize: 14 }}>
                  {provider.logo}
                </div>
              </div>
              <h2 className="oauth-title">
                <strong>FinOps Guard</strong>가<br />
                <span style={{ color: provider.color }}>{provider.name}</span>에 연결을 요청합니다
              </h2>
              <p className="oauth-subtitle">아래 권한을 허용하면 FinOps Guard에서 귀사의 데이터를 통합 모니터링할 수 있습니다</p>
            </div>

            {/* 조직 */}
            <div className="oauth-org-row">
              <span className="oauth-org-label">조직</span>
              <span className="oauth-org-value">
                <span className="user-avatar" style={{ width: 20, height: 20, fontSize: 10 }}>H</span>
                highschool-team
              </span>
            </div>

            {/* 권한 목록 */}
            <div className="oauth-perms">
              <p className="oauth-perms-title">요청 권한</p>
              {perms.map((perm, i) => (
                <div key={i} className="oauth-perm-row">
                  <span className="oauth-perm-icon">{perm.icon}</span>
                  <span className="oauth-perm-text">{perm.text}</span>
                  <span className="oauth-perm-check">✓</span>
                </div>
              ))}
            </div>

            {/* 버튼 */}
            <div className="oauth-actions">
              <button className="oauth-cancel-btn" onClick={onCancel}>취소</button>
              <button className="oauth-allow-btn" style={{ background: provider.color }} onClick={onAllow}>
                인증 허용
              </button>
            </div>

            <p className="oauth-notice">
              허용 후 언제든지 연동 관리 페이지에서 해제할 수 있습니다
            </p>
          </>
        )}

        {step === 'loading' && (
          <div className="oauth-status-wrap">
            <div className="oauth-spinner" style={{ borderTopColor: provider.color }} />
            <div className="provider-logo" style={{ background: provider.color, width: 44, height: 44, fontSize: 13, margin: '0 auto' }}>
              {provider.logo}
            </div>
            <p className="oauth-status-title">OAuth 인증 처리 중...</p>
            <p className="oauth-status-sub">{provider.name}과 보안 연결을 수립하고 있습니다</p>
          </div>
        )}

        {step === 'done' && (
          <div className="oauth-status-wrap">
            <div className="oauth-done-ring" style={{ borderColor: provider.color }}>
              <span className="oauth-done-check" style={{ color: provider.color }}>✓</span>
            </div>
            <p className="oauth-status-title">연동 완료!</p>
            <p className="oauth-status-sub">{provider.name}이(가) 성공적으로 연결되었습니다</p>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function IntegrationPage() {
  const { added, setAdded, connected, setConnected } = useIntegration();
  const [loading, setLoading]         = useState(new Set());
  const [category, setCategory]       = useState('all');
  const [showModal, setShowModal]     = useState(false);
  const [modalCat, setModalCat]       = useState('all');
  const [oauthTarget, setOauthTarget] = useState(null);
  const [apiKeyTarget, setApiKeyTarget] = useState(null);

  /* 연동 해제 */
  const disconnect = (id) => {
    setLoading((p) => new Set([...p, id]));
    setTimeout(() => {
      setConnected((p) => { const n = new Set(p); n.delete(id); return n; });
      setLoading((p) => { const n = new Set(p); n.delete(id); return n; });
    }, 800);
  };

  /* 연동 시작 — 카테고리에 따라 분기 */
  const startConnect = (provider) => {
    if (provider.category === 'ai') {
      setApiKeyTarget({ provider, step: 'input' });
    } else {
      setOauthTarget({ provider, step: 'consent' });
    }
  };

  /* API Key 등록 확인 */
  const confirmApiKey = () => {
    const id = apiKeyTarget.provider.id;
    setApiKeyTarget((prev) => ({ ...prev, step: 'validating' }));
    setTimeout(() => {
      setApiKeyTarget((prev) => ({ ...prev, step: 'done' }));
      setTimeout(() => {
        setConnected((p) => new Set([...p, id]));
        setApiKeyTarget(null);
      }, 750);
    }, 1800);
  };

  /* OAuth 인증 허용 */
  const confirmOAuth = () => {
    const id = oauthTarget.provider.id;
    setOauthTarget((prev) => ({ ...prev, step: 'loading' }));
    setTimeout(() => {
      setOauthTarget((prev) => ({ ...prev, step: 'done' }));
      setTimeout(() => {
        setConnected((p) => new Set([...p, id]));
        setOauthTarget(null);
      }, 750);
    }, 1800);
  };

  /* 카드 삭제 */
  const remove = (id) => {
    setAdded((p)     => { const n = new Set(p); n.delete(id); return n; });
    setConnected((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  /* 카탈로그에서 추가 */
  const addFromCatalog = (id) => setAdded((p) => new Set([...p, id]));

  const addedList   = CATALOG.filter((p) => added.has(p.id));
  const catalogList = CATALOG.filter((p) => !added.has(p.id));

  const visibleAdded   = addedList.filter((p) => category === 'all' || p.category === category);
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
                    <button className="card-remove-btn" onClick={() => remove(p.id)} title="목록에서 제거">×</button>
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
                onClick={() => isConnected ? disconnect(p.id) : startConnect(p)}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : isConnected ? '연동 해제' : '연동하기'}
              </button>
            </div>
          );
        })}

        <button className="provider-add-card" onClick={() => setShowModal(true)}>
          <span className="provider-add-icon">+</span>
          <span className="provider-add-label">서비스 추가</span>
        </button>
      </div>

      {/* ── AI API Key 팝업 ── */}
      {apiKeyTarget && (
        <ApiKeyModal
          target={apiKeyTarget}
          onSubmit={confirmApiKey}
          onCancel={() => setApiKeyTarget(null)}
        />
      )}

      {/* ── OAuth 팝업 (SaaS / 개발 도구) ── */}
      {oauthTarget && (
        <OAuthModal
          target={oauthTarget}
          onAllow={confirmOAuth}
          onCancel={() => setOauthTarget(null)}
        />
      )}

      {/* ── 서비스 추가 모달 ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">서비스 추가</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

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
                      <button className="catalog-add-btn" onClick={() => addFromCatalog(p.id)}>
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

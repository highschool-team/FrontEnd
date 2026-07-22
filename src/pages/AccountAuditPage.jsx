import { useState } from 'react';

const MOCK_ACCOUNTS = [
  { id: 1, name: '홍길동', saas: 'Slack', tier: 'Enterprise', lastLogin: 213, status: 'zombie' },
  { id: 2, name: '이영희', saas: 'Figma', tier: 'Professional', lastLogin: 89, status: 'inactive' },
  { id: 3, name: '박민준', saas: 'Google Workspace', tier: 'Business Plus', lastLogin: 156, status: 'zombie' },
  { id: 4, name: '김수진', saas: 'Slack', tier: 'Pro', lastLogin: 42, status: 'inactive' },
  { id: 5, name: '최현우', saas: 'Figma', tier: 'Professional', lastLogin: 312, status: 'zombie' },
  { id: 6, name: '정다은', saas: 'Google Workspace', tier: 'Business Starter', lastLogin: 67, status: 'inactive' },
  { id: 7, name: '윤재원', saas: 'Slack', tier: 'Enterprise', lastLogin: 190, status: 'zombie' },
  { id: 8, name: '강민서', saas: 'Figma', tier: 'Organization', lastLogin: 78, status: 'inactive' },
];

const TIER_COST = {
  'Enterprise': 28500, 'Professional': 18000, 'Business Plus': 22000,
  'Pro': 9500, 'Business Starter': 7000, 'Organization': 45000,
};

const SAAS_FILTER = ['전체', 'Slack', 'Figma', 'Google Workspace'];

export default function AccountAuditPage() {
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const [filter, setFilter] = useState('전체');
  const [reclaimed, setReclaimed] = useState(new Set());
  const [loading, setLoading] = useState(new Set());

  const visible = accounts.filter(
    (a) => filter === '전체' || a.saas === filter
  );

  const reclaim = (id) => {
    setLoading((p) => new Set([...p, id]));
    setTimeout(() => {
      setReclaimed((p) => new Set([...p, id]));
      setLoading((p) => { const n = new Set(p); n.delete(id); return n; });
    }, 900);
  };

  const zombieCount = accounts.filter((a) => !reclaimed.has(a.id) && a.status === 'zombie').length;
  const reclaimedCost = [...reclaimed].reduce((s, id) => {
    const a = accounts.find((x) => x.id === id);
    return s + (TIER_COST[a?.tier] ?? 0);
  }, 0);
  const wastedCost = accounts
    .filter((a) => !reclaimed.has(a.id))
    .reduce((s, a) => s + (TIER_COST[a.tier] ?? 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">계정 오딧</h1>
          <p className="page-sub">퇴사자·휴면 계정을 감지하고 라이선스를 즉시 회수하세요</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value red">{zombieCount}</span>
          <span className="stat-label">좀비 계정 (180일+)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value orange">₩{wastedCost.toLocaleString()}</span>
          <span className="stat-label">월 낭비 추정 비용</span>
        </div>
        <div className="stat-card">
          <span className="stat-value green">₩{reclaimedCost.toLocaleString()}</span>
          <span className="stat-label">이번 세션 절감액</span>
        </div>
      </div>

      <div className="filter-tabs">
        {SAAS_FILTER.map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="audit-table">
        <div className="audit-header">
          <span>사용자</span>
          <span>SaaS</span>
          <span>라이선스 등급</span>
          <span>마지막 접속</span>
          <span>상태</span>
          <span>월 비용</span>
          <span>액션</span>
        </div>

        {visible.map((a) => {
          const done = reclaimed.has(a.id);
          const busy = loading.has(a.id);
          return (
            <div key={a.id} className={`audit-row ${done ? 'audit-row--done' : ''}`}>
              <span className="audit-user">
                <span className="user-avatar">{a.name[0]}</span>
                {a.name}
              </span>
              <span className="audit-saas">{a.saas}</span>
              <span className="audit-tier">{a.tier}</span>
              <span className="audit-login">{a.lastLogin}일 전</span>
              <span className={`status-badge ${done ? 'status--active' : a.status === 'zombie' ? 'status--blocked' : 'status--warning'}`}>
                {done ? '회수됨' : a.status === 'zombie' ? '좀비' : '휴면'}
              </span>
              <span className="audit-cost">₩{TIER_COST[a.tier].toLocaleString()}</span>
              <button
                className={`reclaim-btn ${done ? 'reclaim-btn--done' : ''}`}
                onClick={() => !done && reclaim(a.id)}
                disabled={done || busy}
              >
                {busy ? '처리 중...' : done ? '완료' : '라이선스 회수'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

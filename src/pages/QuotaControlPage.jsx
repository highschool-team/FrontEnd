import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';

const TEAM_COLORS = ['#4285f4', '#34a853', '#7c3aed', '#f9ab00', '#e91e63'];

const INITIAL_TEAMS = [
  {
    id: 1, team: '프론트엔드팀', budget: 50, spent: 11.2,
    providers: [
      { name: 'OpenAI',    model: 'GPT-4o',      color: '#10a37f', spent: 8.2,  limit: 25 },
      { name: 'Anthropic', model: 'Claude 3.5',  color: '#d97757', spent: 2.1,  limit: 15 },
      { name: 'Gemini',    model: 'Gemini 1.5',  color: '#7c3aed', spent: 0.9,  limit: 10 },
    ],
  },
  {
    id: 2, team: '백엔드팀', budget: 30, spent: 27.8,
    providers: [
      { name: 'Anthropic', model: 'Claude 3.5',  color: '#d97757', spent: 18.4, limit: 20 },
      { name: 'OpenAI',    model: 'GPT-4o',      color: '#10a37f', spent: 9.4,  limit: 10 },
    ],
  },
  {
    id: 3, team: '데이터팀', budget: 100, spent: 8.4,
    providers: [
      { name: 'OpenAI',    model: 'GPT-4o',      color: '#10a37f', spent: 5.8,  limit: 60 },
      { name: 'Gemini',    model: 'Gemini 1.5',  color: '#7c3aed', spent: 1.8,  limit: 25 },
      { name: 'Anthropic', model: 'Claude 3.5',  color: '#d97757', spent: 0.8,  limit: 15 },
    ],
  },
  {
    id: 4, team: 'QA팀', budget: 20, spent: 18.1,
    providers: [
      { name: 'OpenAI',    model: 'GPT-4o-mini', color: '#10a37f', spent: 14.2, limit: 15 },
      { name: 'Anthropic', model: 'Claude 3.5',  color: '#d97757', spent: 3.9,  limit: 5  },
    ],
  },
  {
    id: 5, team: '모바일 앱 팀', budget: 40, spent: 6.7,
    providers: [
      { name: 'Anthropic', model: 'Claude 3.5',  color: '#d97757', spent: 4.8,  limit: 25 },
      { name: 'OpenAI',    model: 'GPT-4o-mini', color: '#10a37f', spent: 1.9,  limit: 15 },
    ],
  },
];

const TEAM_MEMBERS = {
  '프론트엔드팀': [
    { name: '박팀원', used: 3.8,  limit: 12.5 },
    { name: '김수진', used: 4.9,  limit: 12.5 },
    { name: '최현우', used: 1.2,  limit: 12.5 },
    { name: '정다은', used: 1.3,  limit: 12.5 },
  ],
  '백엔드팀': [
    { name: '이영희', used: 12.1, limit: 10   },
    { name: '윤재원', used: 8.9,  limit: 10   },
    { name: '강민서', used: 6.8,  limit: 10   },
  ],
  '데이터팀': [
    { name: '홍길동', used: 5.1,  limit: 33.3 },
    { name: '임채원', used: 3.3,  limit: 33.3 },
  ],
  'QA팀': [
    { name: '김철수', used: 9.8,  limit: 10   },
    { name: '이민지', used: 8.3,  limit: 10   },
  ],
  '모바일 앱 팀': [
    { name: '송지훈', used: 3.1,  limit: 13.3 },
    { name: '배수연', used: 2.4,  limit: 13.3 },
    { name: '오태양', used: 1.2,  limit: 13.3 },
  ],
};

function pct(spent, budget) { return Math.min((spent / budget) * 100, 100); }
function statusOf(spent, budget, providers = []) {
  const p = pct(spent, budget);
  const allProvCapped = providers.length > 0 && providers.every((pr) => pr.spent >= pr.limit);
  if (p >= 100 || allProvCapped) return 'BLOCKED';
  const anyProvWarn = providers.some((pr) => pct(pr.spent, pr.limit) >= 80);
  if (p >= 80 || anyProvWarn) return 'WARNING';
  return 'ACTIVE';
}

function SegmentedBar({ providers, budget, height = 8 }) {
  const totalPct = Math.min(providers.reduce((s, p) => s + p.spent, 0) / budget * 100, 100);
  return (
    <div className="quota-bar-bg" style={{ height }}>
      <div style={{ display: 'flex', width: `${totalPct}%`, height: '100%' }}>
        {providers.map((p) => (
          <div key={p.name} style={{ flex: p.spent, background: p.color, height: '100%' }} />
        ))}
      </div>
    </div>
  );
}

/* ── 전체 예산 설정 패널 ── */
function BudgetOverviewPanel({ teams, companyBudget, setCompanyBudget }) {
  const [inputVal, setInputVal] = useState(String(companyBudget));
  const teamAllocated = teams.reduce((s, t) => s + t.budget, 0);
  const remaining     = companyBudget - teamAllocated;
  const isOver        = teamAllocated > companyBudget;

  const handleSet = () => {
    const v = Number(inputVal);
    if (v >= 1) setCompanyBudget(v);
  };

  return (
    <div className="budget-overview-card">
      <div className="budget-overview-top">
        <div>
          <p className="budget-overview-title">일일 전체 AI API 예산</p>
          <p className="budget-overview-sub">팀별 예산 합계가 전체 예산을 초과하지 않도록 관리합니다</p>
        </div>
        <div className="budget-input-row">
          <span className="budget-input-prefix">$</span>
          <input
            type="number"
            className="budget-input"
            value={inputVal}
            min={1}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSet()}
          />
          <button className="budget-set-btn" onClick={handleSet}>설정</button>
        </div>
      </div>

      <div className="budget-alloc-bar">
        {teams.map((t, i) => {
          const segPct = Math.min((t.budget / companyBudget) * 100, 100);
          return (
            <div
              key={t.id}
              className="budget-alloc-seg"
              style={{ width: `${segPct}%`, background: TEAM_COLORS[i % TEAM_COLORS.length] }}
              title={`${t.team}: $${t.budget}`}
            />
          );
        })}
        {remaining > 0 && (
          <div className="budget-alloc-seg budget-alloc-remain"
            style={{ width: `${(remaining / companyBudget) * 100}%` }} />
        )}
      </div>

      <div className="budget-legend">
        {teams.map((t, i) => (
          <span key={t.id} className="budget-legend-item">
            <span className="budget-legend-dot" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
            {t.team} <strong>${t.budget}</strong>
          </span>
        ))}
        {remaining > 0 && (
          <span className="budget-legend-item budget-legend-remain">
            <span className="budget-legend-dot" style={{ background: '#d0d7de' }} />
            미배분 <strong>${remaining}</strong>
          </span>
        )}
      </div>

      <div className={`budget-summary ${isOver ? 'budget-summary--warn' : remaining === 0 ? 'budget-summary--ok' : ''}`}>
        {isOver
          ? `⚠ 팀 배분 합계 $${teamAllocated}가 전체 예산 $${companyBudget}를 $${teamAllocated - companyBudget} 초과합니다`
          : remaining === 0
          ? `✓ 전체 예산 $${companyBudget} 배분 완료`
          : `팀 배분 $${teamAllocated} / 전체 $${companyBudget} (${((teamAllocated / companyBudget) * 100).toFixed(0)}%)  ·  잔여 $${remaining} 미배분`}
      </div>
    </div>
  );
}

/* ── 테크리드 뷰 ── */
function TechLeadView({ teams, setTeams, simulating, startSim, stopSim, companyBudget, setCompanyBudget }) {
  const [expandedId, setExpandedId] = useState(null);

  const teamAllocated = teams.reduce((s, t) => s + t.budget, 0);
  const totalSpent    = teams.reduce((s, t) => s + t.spent, 0);
  const blocked       = teams.filter((t) => statusOf(t.spent, t.budget) === 'BLOCKED').length;

  const updateTeamBudget = (id, val) =>
    setTeams((prev) => prev.map((t) => t.id === id ? { ...t, budget: val } : t));

  const updateProviderLimit = (teamId, provName, val) =>
    setTeams((prev) => prev.map((t) =>
      t.id !== teamId ? t : {
        ...t,
        providers: t.providers.map((p) => p.name === provName ? { ...p, limit: val } : p),
      }
    ));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">API 할당 제어</h1>
          <p className="page-sub">팀 예산과 제공사별 한도를 설정하고 실시간 소비를 모니터링합니다</p>
        </div>
        <button className={`sim-btn ${simulating ? 'sim-btn--stop' : ''}`} onClick={simulating ? stopSim : startSim}>
          {simulating ? '⏹ 시뮬레이션 중지' : '⚡ 트래픽 폭주 시뮬레이션'}
        </button>
      </div>

      <BudgetOverviewPanel teams={teams} companyBudget={companyBudget} setCompanyBudget={setCompanyBudget} />

      <div className="stat-row">
        <div className="stat-card"><span className="stat-value blue">${companyBudget}</span><span className="stat-label">전체 예산</span></div>
        <div className="stat-card"><span className="stat-value">${teamAllocated}</span><span className="stat-label">팀 배분 합계</span></div>
        <div className="stat-card"><span className="stat-value orange">${totalSpent.toFixed(1)}</span><span className="stat-label">오늘 실소비</span></div>
        <div className="stat-card"><span className={`stat-value ${blocked > 0 ? 'red' : 'green'}`}>{blocked}</span><span className="stat-label">차단된 API</span></div>
      </div>

      <div className="quota-table">
        <div className="quota-table-header">
          <span>팀</span><span>사용 제공사</span><span>일일 예산 한도 ($)</span><span>오늘 소비</span><span>상태</span>
        </div>

        {teams.map((t) => {
          const p          = pct(t.spent, t.budget);
          const status     = statusOf(t.spent, t.budget, t.providers);
          const isExpanded = expandedId === t.id;
          const provSum    = t.providers.reduce((s, p) => s + p.limit, 0);

          return (
            <div key={t.id} className="quota-row-group">
              {/* 메인 행 — 클릭 시 확장 */}
              <div
                className={`quota-row quota-row--clickable ${status === 'BLOCKED' ? 'quota-row--blocked' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
              >
                <span className="quota-team">
                  {t.team}
                  <span className={`quota-chevron ${isExpanded ? 'quota-chevron--open' : ''}`}>›</span>
                </span>

                <div className="quota-providers">
                  {t.providers.map((p) => (
                    <span key={p.name} className="quota-provider-tag">
                      <span className="provider-dot" style={{ background: p.color }} />
                      {p.name}
                      <span style={{ color: '#9e9e9e', fontSize: 11 }}> · {p.model}</span>
                    </span>
                  ))}
                </div>

                <span className="quota-budget-val" style={{ fontSize: 14 }}>${t.budget}</span>

                <div className="quota-spent-wrap">
                  <SegmentedBar providers={t.providers} budget={t.budget} />
                  <span className="quota-spent-label">${t.spent.toFixed(1)} ({p.toFixed(0)}%)</span>
                </div>

                <span className={`status-badge status--${status.toLowerCase()}`}>{status}</span>
              </div>

              {/* 확장 패널 — 팀 한도 + 제공사별 한도 설정 */}
              {isExpanded && (
                <div className="quota-expanded-panel">

                  {/* ── 팀 한도 설정 ── */}
                  <p className="quota-expanded-title">팀 일일 한도 설정</p>
                  <div className="quota-team-limit-row">
                    <div className="budget-input-row" style={{ borderRadius: 8 }}>
                      <span className="budget-input-prefix">$</span>
                      <input
                        type="number"
                        className="budget-input"
                        value={t.budget}
                        min={1}
                        max={companyBudget}
                        onChange={(e) => updateTeamBudget(t.id, Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <div className="quota-spent-wrap" style={{ flex: 1 }}>
                      <SegmentedBar providers={t.providers} budget={t.budget} height={8} />
                      <span className="quota-spent-label">${t.spent.toFixed(1)} / ${t.budget} ({p.toFixed(0)}%)</span>
                    </div>
                    <span className={`status-badge status--${status.toLowerCase()}`} style={{ fontSize: 11 }}>{status}</span>
                  </div>

                  <div className="quota-expanded-divider" />

                  {/* ── 제공사별 한도 설정 ── */}
                  <p className="quota-expanded-title">제공사별 예산 한도 설정</p>

                  {t.providers.map((prov) => {
                    const pp       = pct(prov.spent, prov.limit);
                    const barColor = pp >= 100 ? '#ea4335' : pp >= 80 ? '#f9ab00' : prov.color;
                    return (
                      <div key={prov.name} className="quota-prov-row">
                        <div className="quota-prov-info">
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: prov.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{prov.name}</span>
                          <span style={{ fontSize: 12, color: '#5f6368' }}>{prov.model}</span>
                        </div>

                        <div className="quota-slider-wrap">
                          <input type="range" min={1} max={t.budget} value={prov.limit}
                            className="quota-slider quota-slider--colored"
                            style={{ '--prov-color': prov.color }}
                            onChange={(e) => updateProviderLimit(t.id, prov.name, Number(e.target.value))} />
                          <span className="quota-budget-val" style={{ color: prov.color }}>${prov.limit}</span>
                        </div>

                        <div className="quota-spent-wrap">
                          <div className="quota-bar-bg">
                            <div style={{ width: `${pp}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.1s linear' }} />
                          </div>
                          <span className="quota-spent-label">
                            ${prov.spent.toFixed(1)} / ${prov.limit} ({pp.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* 배분 합계 확인 */}
                  <div className={`quota-expanded-footer ${provSum > t.budget ? 'footer--warn' : provSum === t.budget ? 'footer--ok' : ''}`}>
                    {provSum > t.budget
                      ? `⚠ 제공사 합계 $${provSum}가 팀 예산 $${t.budget}를 초과합니다`
                      : provSum < t.budget
                      ? `잔여 $${t.budget - provSum} 미배분 — 슬라이더를 조정해 예산을 배분하세요`
                      : `✓ 팀 예산 $${t.budget} 배분 완료`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {teams.map((t) => (
          <MemberTable key={t.id} teamName={t.team} teamBudget={t.budget} teamSpent={t.spent} />
        ))}
      </div>

      {simulating && <div className="sim-notice">⚡ 트래픽 폭주 시뮬레이션 진행 중 — 예산 초과 시 즉시 BLOCKED 전이됩니다</div>}
    </>
  );
}

/* ── 파트장 뷰 ── */
function PartLeadView({ teams, myTeam }) {
  const myTeamData = teams.find((t) => t.team === myTeam);
  if (!myTeamData) return null;
  const p      = pct(myTeamData.spent, myTeamData.budget);
  const status = statusOf(myTeamData.spent, myTeamData.budget);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">API 할당 제어</h1>
          <p className="page-sub">{myTeam} 팀의 예산 현황 및 팀원별 사용량을 확인합니다</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><span className="stat-value blue">${myTeamData.budget}</span><span className="stat-label">팀 일일 예산</span></div>
        <div className="stat-card"><span className="stat-value orange">${myTeamData.spent.toFixed(1)}</span><span className="stat-label">오늘 소비</span></div>
        <div className="stat-card"><span className="stat-value">{p.toFixed(0)}%</span><span className="stat-label">예산 소진율</span></div>
        <div className="stat-card"><span className={`stat-value ${status === 'BLOCKED' ? 'red' : status === 'WARNING' ? 'orange' : 'green'}`}>{status}</span><span className="stat-label">상태</span></div>
      </div>

      <div className="analytics-card" style={{ marginBottom: 24 }}>
        <SegmentedBar providers={myTeamData.providers} budget={myTeamData.budget} height={12} />
        <p style={{ fontSize: 13, color: '#5f6368', marginTop: 8, marginBottom: 16 }}>
          ${myTeamData.spent.toFixed(1)} / ${myTeamData.budget} ({p.toFixed(0)}%)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myTeamData.providers.map((prov) => {
            const pp = pct(prov.spent, prov.limit);
            return (
              <div key={prov.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 110 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: prov.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{prov.name}</span>
                </div>
                <span style={{ fontSize: 12, color: '#5f6368', minWidth: 90 }}>{prov.model}</span>
                <div className="quota-bar-bg" style={{ flex: 1, height: 6, borderRadius: 3 }}>
                  <div style={{ width: `${pp}%`, height: '100%', background: prov.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, color: '#5f6368', minWidth: 90, textAlign: 'right' }}>
                  ${prov.spent.toFixed(1)} / ${prov.limit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <MemberTable teamName={myTeam} teamBudget={myTeamData.budget} teamSpent={myTeamData.spent} />
    </>
  );
}

/* ── 팀원 뷰 ── */
function MemberView({ teams, myTeam, myName }) {
  const myTeamData = teams.find((t) => t.team === myTeam);
  const myData     = TEAM_MEMBERS[myTeam]?.find((m) => m.name === myName);
  if (!myTeamData || !myData) return null;

  const teamPct = pct(myTeamData.spent, myTeamData.budget);
  const myPct   = pct(myData.used, myData.limit);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">API 할당 제어</h1>
          <p className="page-sub">내 팀 할당량과 내 사용량을 확인합니다</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><span className="stat-value blue">${myTeamData.budget}</span><span className="stat-label">팀 일일 예산</span></div>
        <div className="stat-card"><span className="stat-value orange">${myTeamData.spent.toFixed(1)}</span><span className="stat-label">팀 오늘 소비</span></div>
        <div className="stat-card"><span className="stat-value purple">${myData.used.toFixed(1)}</span><span className="stat-label">내 오늘 사용량</span></div>
        <div className="stat-card"><span className="stat-value green">${(myData.limit - myData.used).toFixed(1)}</span><span className="stat-label">내 잔여 한도</span></div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div className="analytics-card" style={{ flex: 1, minWidth: 260 }}>
          <p style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>팀 전체 예산 소진율</p>
          <SegmentedBar providers={myTeamData.providers} budget={myTeamData.budget} height={12} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {myTeamData.providers.map((prov) => (
              <span key={prov.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5f6368' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: prov.color }} />
                {prov.name} ${prov.spent.toFixed(1)}
              </span>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#5f6368', marginTop: 6 }}>${myTeamData.spent.toFixed(1)} / ${myTeamData.budget} ({teamPct.toFixed(0)}%)</p>
        </div>

        <div className="analytics-card" style={{ flex: 1, minWidth: 260 }}>
          <p style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>내 사용량</p>
          <div className="quota-bar-bg" style={{ height: 12, borderRadius: 6 }}>
            <div className={`quota-bar-fill ${myPct >= 80 ? 'fill--orange' : 'fill--green'}`} style={{ width: `${myPct}%`, height: '100%', borderRadius: 6 }} />
          </div>
          <p style={{ fontSize: 13, color: '#5f6368', marginTop: 8 }}>${myData.used.toFixed(1)} / ${myData.limit} ({myPct.toFixed(0)}%)</p>
        </div>
      </div>
    </>
  );
}

/* ── 공용: 팀원 사용량 테이블 ── */
function MemberTable({ teamName, teamBudget, teamSpent }) {
  const members = TEAM_MEMBERS[teamName] ?? [];
  return (
    <div className="analytics-card">
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{teamName} · 팀원별 사용량</p>
      <div className="member-table">
        <div className="member-table-header">
          <span>팀원</span><span>사용량 ($)</span><span>개인 한도 대비</span><span>팀 예산 기여율</span>
        </div>
        {members.map((m) => {
          const mp           = pct(m.used, m.limit);
          const contribution = ((m.used / teamSpent) * 100).toFixed(1);
          return (
            <div key={m.name} className="member-row">
              <span className="member-name">
                <span className="user-avatar">{m.name[0]}</span>{m.name}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>${m.used.toFixed(1)}</span>
              <div className="quota-spent-wrap">
                <div className="quota-bar-bg" style={{ minWidth: 80 }}>
                  <div className={`quota-bar-fill ${mp >= 80 ? 'fill--orange' : 'fill--green'}`} style={{ width: `${mp}%` }} />
                </div>
                <span className="quota-spent-label">{mp.toFixed(0)}%</span>
              </div>
              <span className="member-contribution">{contribution}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function QuotaControlPage() {
  const { user } = useUser();
  const [teams, setTeams]               = useState(INITIAL_TEAMS);
  const [simulating, setSimulating]     = useState(false);
  const [companyBudget, setCompanyBudget] = useState(500);
  const intervalRef = useRef(null);

  const startSim = () => { setTeams(INITIAL_TEAMS); setSimulating(true); };
  const stopSim  = () => { clearInterval(intervalRef.current); setSimulating(false); };

  useEffect(() => {
    if (!simulating) return;
    intervalRef.current = setInterval(() => {
      setTeams((prev) => {
        const next = prev.map((t) => {
          // 팀 예산 또는 모든 제공사가 한도 도달 시 증가 없음
          const allCapped = t.providers.every((p) => p.spent >= p.limit);
          if (t.spent >= t.budget || allCapped) return t;

          const inc = Math.random() * 2.5;

          // 한도 미달 제공사에만 증가 배분
          const available = t.providers.filter((p) => p.spent < p.limit);
          const availTotal = available.reduce((s, p) => s + p.spent, 0);

          const newProviders = t.providers.map((p) => {
            if (p.spent >= p.limit) return p;
            const share = availTotal > 0 ? p.spent / availTotal : 1 / available.length;
            return { ...p, spent: Math.min(p.spent + inc * share, p.limit) };
          });

          // 팀 총 소비 = 제공사 합계 (팀 예산 상한 적용)
          const newSpent = Math.min(
            newProviders.reduce((s, p) => s + p.spent, 0),
            t.budget,
          );
          return { ...t, spent: newSpent, providers: newProviders };
        });

        const allDone = next.every((t) =>
          t.spent >= t.budget || t.providers.every((p) => p.spent >= p.limit),
        );
        if (allDone) { clearInterval(intervalRef.current); setSimulating(false); }
        return next;
      });
    }, 120);
    return () => clearInterval(intervalRef.current);
  }, [simulating]);

  return (
    <div className="page">
      {user.role === 'techlead' && (
        <TechLeadView teams={teams} setTeams={setTeams} simulating={simulating} startSim={startSim} stopSim={stopSim}
          companyBudget={companyBudget} setCompanyBudget={setCompanyBudget} />
      )}
      {user.role === 'partlead' && (
        <PartLeadView teams={teams} myTeam={user.team} />
      )}
      {user.role === 'member' && (
        <MemberView teams={teams} myTeam={user.team} myName={user.memberName} />
      )}
    </div>
  );
}

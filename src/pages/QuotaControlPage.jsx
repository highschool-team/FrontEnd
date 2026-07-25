import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useIntegration } from '../context/IntegrationContext';
import api from '../api/index.js';

const PROVIDER_INTEGRATION_ID = {
  OpenAI:    'openai',
  Anthropic: 'claude',
  Gemini:    'gemini',
  Mistral:   'mistral',
  Cohere:    'cohere',
};

const INTEGRATION_ID_TO_PROVIDER = {
  openai:  'OpenAI',
  claude:  'Anthropic',
  gemini:  'Gemini',
  mistral: 'Mistral',
  cohere:  'Cohere',
};

const PROVIDER_COLORS = {
  OpenAI:    '#10a37f',
  Anthropic: '#d97757',
  Gemini:    '#7c3aed',
  Mistral:   '#ff6b35',
  Cohere:    '#39594d',
};

const TEAM_COLORS = ['#4285f4', '#34a853', '#7c3aed', '#f9ab00', '#e91e63'];

const PROVIDER_MODELS = {
  OpenAI:    [
    { name: 'GPT-4o',      cost: 3 },
    { name: 'GPT-4o-mini', cost: 2 },
    { name: 'o3-mini',     cost: 1 },
  ],
  Anthropic: [
    { name: 'Claude Opus 4.7',   cost: 3 },
    { name: 'Claude Sonnet 4.6', cost: 2 },
    { name: 'Claude Haiku 4.5',  cost: 1 },
  ],
  Gemini: [
    { name: 'Gemini 2.5 Pro',   cost: 3 },
    { name: 'Gemini 2.5 Flash', cost: 2 },
    { name: 'Gemini 2.0 Flash', cost: 1 },
  ],
  Mistral: [
    { name: 'Mistral Large', cost: 3 },
    { name: 'Mistral Small', cost: 1 },
  ],
  Cohere: [
    { name: 'Command R+', cost: 3 },
    { name: 'Command R',  cost: 1 },
  ],
};

// Normalize a team from the API into the shape the UI expects
function normalizeTeam(t) {
  return {
    id:        t.id,
    team:      t.name,
    budget:    parseFloat(t.budget)    || 0,
    spent:     parseFloat(t.spent)     || 0,
    allocated: parseFloat(t.allocated) || 0,
    status:    t.status,
    providers: (t.providers ?? []).map((p) => ({
      name:          p.name,
      color:         p.color ?? PROVIDER_COLORS[p.name] ?? '#888',
      limit:         parseFloat(p.limit) || 0,
      spent:         parseFloat(p.spent) || 0,
      selectedModel: p.selected_model ?? null,
      allowedModels: p.allowed_models ?? [],
    })),
  };
}

function pct(spent, budget) { return budget > 0 ? Math.min((spent / budget) * 100, 100) : 0; }
function statusOf(spent, budget, providers = []) {
  const p = pct(spent, budget);
  const allProvCapped = providers.length > 0 && providers.every((pr) => pr.spent >= pr.limit);
  if (p >= 100 || allProvCapped) return 'BLOCKED';
  const anyProvWarn = providers.some((pr) => pct(pr.spent, pr.limit) >= 80);
  if (p >= 80 || anyProvWarn) return 'WARNING';
  return 'ACTIVE';
}

function SegmentedBar({ providers, budget, height = 8 }) {
  const totalPct = budget > 0 ? Math.min(providers.reduce((s, p) => s + p.spent, 0) / budget * 100, 100) : 0;
  return (
    <div className="quota-bar-bg" style={{ height }}>
      <div style={{ display: 'flex', width: `${totalPct}%`, height: '100%' }}>
        {providers.map((p) => (
          <div key={p.name} style={{ flex: p.spent || 1, background: p.color, height: '100%' }} />
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
          const segPct = companyBudget > 0 ? Math.min((t.budget / companyBudget) * 100, 100) : 0;
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
          : `팀 배분 $${teamAllocated} / 전체 $${companyBudget} (${companyBudget > 0 ? ((teamAllocated / companyBudget) * 100).toFixed(0) : 0}%)  ·  잔여 $${remaining} 미배분`}
      </div>
    </div>
  );
}

/* ── 팀원 사용량 테이블 (API 연동) ── */
function MemberTable({ teamId, teamName, teamBudget, teamSpent }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!teamId) return;
    api.get(`/teams/${teamId}/members/usage/`)
      .then(({ data }) => setMembers(data.members ?? []))
      .catch(() => setMembers([]));
  }, [teamId]);

  return (
    <div className="analytics-card">
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>{teamName} · 팀원별 사용량</p>
      <div className="member-table">
        <div className="member-table-header">
          <span>팀원</span><span>사용량 ($)</span><span>호출 수</span><span>팀 예산 기여율</span>
        </div>
        {members.length === 0 && (
          <p style={{ fontSize: 13, color: '#9e9e9e', padding: '12px 0' }}>팀원 데이터가 없습니다</p>
        )}
        {[...members].sort((a, b) => (b.total_cost ?? 0) - (a.total_cost ?? 0)).map((m) => {
          const contribution = teamSpent > 0 ? ((m.total_cost / teamSpent) * 100).toFixed(1) : '—';
          return (
            <div key={m.user_id} className="member-row">
              <span className="member-name">
                <span className="user-avatar">{m.email[0].toUpperCase()}</span>{m.email}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>${(m.total_cost ?? 0).toFixed(2)}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{(m.total_calls ?? 0).toLocaleString()}건</span>
              <span className="member-contribution">{contribution}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 테크리드 뷰 ── */
function TechLeadView({ teams, refetchTeams, simulating, startSim, stopSim, companyBudget, setCompanyBudget }) {
  const [expandedId, setExpandedId] = useState(null);
  const { connected } = useIntegration();

  const totalSpent    = teams.reduce((s, t) => s + t.spent, 0);
  const teamAllocated = teams.reduce((s, t) => s + t.budget, 0);
  const blocked       = teams.filter((t) => statusOf(t.spent, t.budget) === 'BLOCKED').length;

  const updateTeamBudget = async (teamId, val) => {
    try {
      await api.put(`/teams/${teamId}/budget/`, { budget: val });
      refetchTeams();
    } catch (e) {
      console.error('budget update failed', e);
    }
  };

  const addProviderToTeam = async (teamId, provName) => {
    try {
      await api.post(`/teams/${teamId}/providers/`, { name: provName });
      refetchTeams();
    } catch (e) {
      console.error('add provider failed', e);
    }
  };

  const removeProviderFromTeam = async (teamId, provName) => {
    try {
      await api.delete(`/teams/${teamId}/providers/${provName}/`);
      refetchTeams();
    } catch (e) {
      console.error('remove provider failed', e);
    }
  };

  const updateProviderLimit = async (teamId, provName, val) => {
    try {
      await api.put(`/teams/${teamId}/providers/${provName}/limit/`, { limit: val });
      refetchTeams();
    } catch (e) {
      console.error('update limit failed', e);
    }
  };

  const selectModel = async (teamId, provName, modelName) => {
    try {
      await api.put(`/teams/${teamId}/providers/${provName}/model/`, { model: modelName });
      refetchTeams();
    } catch (e) {
      console.error('select model failed', e);
    }
  };

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
          const connectedAiNames = [...connected]
            .filter((id) => INTEGRATION_ID_TO_PROVIDER[id])
            .map((id) => INTEGRATION_ID_TO_PROVIDER[id]);
          const availableToAdd = connectedAiNames.filter(
            (name) => !t.providers.some((p) => p.name === name)
          );

          return (
            <div key={t.id} className="quota-row-group">
              <div
                className={`quota-row quota-row--clickable ${status === 'BLOCKED' ? 'quota-row--blocked' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
              >
                <span className="quota-team">
                  {t.team}
                  <span className={`quota-chevron ${isExpanded ? 'quota-chevron--open' : ''}`}>›</span>
                </span>

                <div className="quota-providers">
                  {t.providers.length > 0 ? t.providers.map((p) => (
                    <span key={p.name} className="quota-provider-tag">
                      <span className="provider-dot" style={{ background: p.color }} />
                      {p.name}
                      {p.selectedModel && (
                        <span style={{ color: '#9e9e9e', fontSize: 11 }}> · {p.selectedModel}</span>
                      )}
                    </span>
                  )) : (
                    <span style={{ fontSize: 12, color: '#9e9e9e' }}>배정된 AI 없음</span>
                  )}
                </div>

                <span className="quota-budget-val" style={{ fontSize: 14 }}>${t.budget}</span>

                <div className="quota-spent-wrap">
                  <SegmentedBar providers={t.providers} budget={t.budget} />
                  <span className="quota-spent-label">${t.spent.toFixed(1)} ({p.toFixed(0)}%)</span>
                </div>

                <span className={`status-badge status--${status.toLowerCase()}`}>{status}</span>
              </div>

              {isExpanded && (
                <div className="quota-expanded-panel">
                  <p className="quota-expanded-title">팀 일일 한도 설정</p>
                  <div className="quota-team-limit-row">
                    <div className="budget-input-row" style={{ borderRadius: 8 }}>
                      <span className="budget-input-prefix">$</span>
                      <input
                        type="number"
                        className="budget-input"
                        defaultValue={t.budget}
                        min={1}
                        max={companyBudget}
                        onBlur={(e) => {
                          const v = Math.max(1, Number(e.target.value));
                          if (v !== t.budget) updateTeamBudget(t.id, v);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = Math.max(1, Number(e.target.value));
                            if (v !== t.budget) updateTeamBudget(t.id, v);
                          }
                        }}
                      />
                    </div>
                    <div className="quota-spent-wrap" style={{ flex: 1 }}>
                      <SegmentedBar providers={t.providers} budget={t.budget} height={8} />
                      <span className="quota-spent-label">${t.spent.toFixed(1)} / ${t.budget} ({p.toFixed(0)}%)</span>
                    </div>
                    <span className={`status-badge status--${status.toLowerCase()}`} style={{ fontSize: 11 }}>{status}</span>
                  </div>

                  <div className="quota-expanded-divider" />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p className="quota-expanded-title" style={{ margin: 0 }}>제공사별 예산 한도 설정</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {availableToAdd.map((name) => (
                        <button
                          key={name}
                          onClick={() => addProviderToTeam(t.id, name)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: `1.5px dashed ${PROVIDER_COLORS[name]}`, borderRadius: 20, background: 'transparent', color: PROVIDER_COLORS[name], fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PROVIDER_COLORS[name] }} />
                          + {name}
                        </button>
                      ))}
                      {availableToAdd.length === 0 && connected.size === 0 && (
                        <span style={{ fontSize: 12, color: '#9e9e9e' }}>연동 관리에서 AI를 먼저 연결하세요</span>
                      )}
                    </div>
                  </div>

                  {t.providers.length === 0 && (
                    <p style={{ fontSize: 13, color: '#9e9e9e', padding: '8px 0' }}>
                      {connected.size === 0 ? '연동 관리에서 AI API를 먼저 연결하세요.' : '위 버튼으로 이 팀에 사용할 AI를 추가하세요.'}
                    </p>
                  )}

                  {t.providers.map((prov) => {
                    const pp       = pct(prov.spent, prov.limit);
                    const barColor = pp >= 100 ? '#ea4335' : pp >= 80 ? '#f9ab00' : prov.color;
                    const otherSum = t.providers.filter((p) => p.name !== prov.name).reduce((s, p) => s + p.limit, 0);
                    const provMax  = Math.max(1, t.budget - otherSum);
                    const models   = PROVIDER_MODELS[prov.name] ?? [];
                    const COST_LABEL = { 3: '$$$', 2: '$$', 1: '$' };
                    const COST_COLOR = { 3: '#ea4335', 2: '#f9ab00', 1: '#34a853' };
                    return (
                      <div key={prov.name} className="quota-prov-section">
                        <div className="quota-prov-row">
                          <div className="quota-prov-info">
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: prov.color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{prov.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeProviderFromTeam(t.id, prov.name); }}
                              style={{ marginLeft: 4, background: 'none', border: 'none', color: '#bdbdbd', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
                              title="이 팀에서 제거"
                            >×</button>
                          </div>

                          <div className="quota-slider-wrap">
                            <input type="range" min={1} max={provMax} value={prov.limit}
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

                        {models.length > 0 && (
                          <div className="model-chip-row">
                            <span className="model-chip-label">사용 모델</span>
                            {models.map((m) => {
                              const selected = prov.selectedModel === m.name;
                              return (
                                <button
                                  key={m.name}
                                  className={`model-chip ${selected ? 'model-chip--on' : 'model-chip--off'}`}
                                  onClick={() => selectModel(t.id, prov.name, m.name)}
                                  title={selected ? '선택 해제' : '이 모델로 선택'}
                                >
                                  <span className="model-cost-badge" style={{ color: COST_COLOR[m.cost] }}>
                                    {COST_LABEL[m.cost]}
                                  </span>
                                  {m.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

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
          <MemberTable key={t.id} teamId={t.id} teamName={t.team} teamBudget={t.budget} teamSpent={t.spent} />
        ))}
      </div>

      {simulating && <div className="sim-notice">⚡ 트래픽 폭주 시뮬레이션 진행 중 — 예산 초과 시 즉시 BLOCKED 전이됩니다</div>}
    </>
  );
}

/* ── 파트장 뷰 ── */
const PERIOD_OPTIONS = [
  { key: 'day',   label: '하루',  mult: 1  },
  { key: 'week',  label: '주',    mult: 7  },
  { key: 'month', label: '월',    mult: 30 },
];

function PartLeadView({ teams, refetchTeams, myTeamId }) {
  const [period, setPeriod] = useState('day');
  const myTeamData = teams.find((t) => t.id === myTeamId) ?? teams[0];
  if (!myTeamData) return null;

  const visibleProviders = myTeamData.providers;
  const mult   = PERIOD_OPTIONS.find((o) => o.key === period).mult;
  const projBudget = myTeamData.budget * mult;
  const projSpent  = myTeamData.spent  * mult;

  const p      = pct(myTeamData.spent, myTeamData.budget);
  const status = statusOf(myTeamData.spent, myTeamData.budget, visibleProviders);
  const provSum = visibleProviders.reduce((s, p) => s + p.limit, 0);

  const COST_LABEL = { 3: '$$$', 2: '$$', 1: '$' };
  const COST_COLOR = { 3: '#ea4335', 2: '#f9ab00', 1: '#34a853' };

  const updateProviderLimit = async (provName, val) => {
    try {
      await api.put(`/teams/${myTeamData.id}/providers/${provName}/limit/`, { limit: val });
      refetchTeams();
    } catch (e) {
      console.error('update limit failed', e);
    }
  };

  const selectModel = async (provName, modelName) => {
    try {
      await api.put(`/teams/${myTeamData.id}/providers/${provName}/model/`, { model: modelName });
      refetchTeams();
    } catch (e) {
      console.error('select model failed', e);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">API 할당 제어</h1>
          <p className="page-sub">{myTeamData.team} · 제공사별 한도 및 허용 모델을 설정합니다</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setPeriod(o.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1.5px solid',
              background: period === o.key ? 'var(--blue)' : 'transparent',
              borderColor: period === o.key ? 'var(--blue)' : 'var(--border)',
              color: period === o.key ? '#fff' : 'var(--sub)',
            }}
          >{o.label}</button>
        ))}
        {period !== 'day' && (
          <span style={{ fontSize: 12, color: '#9e9e9e', alignSelf: 'center', marginLeft: 4 }}>
            일일 소비 × {mult} 기준 예측
          </span>
        )}
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value blue">${projBudget}</span>
          <span className="stat-label">{period === 'day' ? '일일' : period === 'week' ? '주간' : '월간'} 예산</span>
        </div>
        <div className="stat-card">
          <span className="stat-value orange">${projSpent.toFixed(1)}</span>
          <span className="stat-label">{period === 'day' ? '오늘' : period === 'week' ? '주간 예측' : '월간 예측'} 소비</span>
        </div>
        <div className="stat-card"><span className="stat-value">{p.toFixed(0)}%</span><span className="stat-label">예산 소진율</span></div>
        <div className="stat-card">
          <span className={`stat-value ${status === 'BLOCKED' ? 'red' : status === 'WARNING' ? 'orange' : 'green'}`}>{status}</span>
          <span className="stat-label">상태</span>
        </div>
      </div>

      <div className="analytics-card" style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>팀 예산 소진 현황</p>
        <SegmentedBar providers={visibleProviders} budget={myTeamData.budget} height={12} />
        <p style={{ fontSize: 13, color: '#5f6368', marginTop: 8 }}>
          ${myTeamData.spent.toFixed(1)} / ${myTeamData.budget} ({p.toFixed(0)}%)
        </p>
      </div>

      <div className="quota-table" style={{ marginBottom: 24 }}>
        <div className="quota-table-header" style={{ gridTemplateColumns: '120px 1fr 200px' }}>
          <span>제공사</span><span>한도 설정 ($)</span><span>오늘 소비</span>
        </div>

        {visibleProviders.length === 0 && (
          <p style={{ fontSize: 13, color: '#9e9e9e', padding: '16px 20px' }}>
            배정된 AI 제공사가 없습니다.
          </p>
        )}

        {visibleProviders.map((prov) => {
          const pp       = pct(prov.spent, prov.limit);
          const barColor = pp >= 100 ? '#ea4335' : pp >= 80 ? '#f9ab00' : prov.color;
          const otherSum = visibleProviders.filter((p) => p.name !== prov.name).reduce((s, p) => s + p.limit, 0);
          const provMax  = Math.max(1, myTeamData.budget - otherSum);
          const models   = PROVIDER_MODELS[prov.name] ?? [];

          return (
            <div key={prov.name} className="quota-prov-section" style={{ padding: '14px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 200px', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: prov.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{prov.name}</span>
                </div>

                <div className="quota-slider-wrap">
                  <input type="range" min={1} max={provMax} value={prov.limit}
                    className="quota-slider quota-slider--colored"
                    style={{ '--prov-color': prov.color }}
                    onChange={(e) => updateProviderLimit(prov.name, Number(e.target.value))} />
                  <span className="quota-budget-val" style={{ color: prov.color }}>${prov.limit}</span>
                </div>

                <div className="quota-spent-wrap">
                  <div className="quota-bar-bg">
                    <div style={{ width: `${pp}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.1s' }} />
                  </div>
                  <span className="quota-spent-label">${prov.spent.toFixed(1)} ({pp.toFixed(0)}%)</span>
                </div>
              </div>

              {models.length > 0 && (
                <div className="model-chip-row" style={{ paddingLeft: 16 }}>
                  <span className="model-chip-label">사용 모델</span>
                  {models.map((m) => {
                    const selected = prov.selectedModel === m.name;
                    return (
                      <button
                        key={m.name}
                        className={`model-chip ${selected ? 'model-chip--on' : 'model-chip--off'}`}
                        onClick={() => selectModel(prov.name, m.name)}
                        title={selected ? '선택 해제' : '이 모델로 선택'}
                      >
                        <span className="model-cost-badge" style={{ color: COST_COLOR[m.cost] }}>
                          {COST_LABEL[m.cost]}
                        </span>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className={`quota-expanded-footer ${provSum > myTeamData.budget ? 'footer--warn' : provSum === myTeamData.budget ? 'footer--ok' : ''}`}
          style={{ margin: '0 16px 16px', borderRadius: 8 }}>
          {provSum > myTeamData.budget
            ? `⚠ 제공사 합계 $${provSum}가 팀 예산 $${myTeamData.budget}를 초과합니다`
            : provSum === myTeamData.budget
            ? `✓ 팀 예산 $${myTeamData.budget} 배분 완료`
            : `잔여 $${myTeamData.budget - provSum} 미배분`}
        </div>
      </div>

      <MemberTable teamId={myTeamData.id} teamName={myTeamData.team} teamBudget={myTeamData.budget} teamSpent={myTeamData.spent} />
    </>
  );
}

/* ── 팀원 뷰 ── */
function MemberView({ teams, myTeamId }) {
  const myTeamData = teams.find((t) => t.id === myTeamId) ?? teams[0];
  const { user }   = useUser();
  const [myData, setMyData] = useState(null);

  useEffect(() => {
    if (!myTeamData) return;
    api.get(`/teams/${myTeamData.id}/members/usage/`)
      .then(({ data }) => {
        const me = (data.members ?? []).find((m) => m.email === user.email);
        if (me) setMyData(me);
      })
      .catch(() => {});
  }, [myTeamData, user.email]);

  if (!myTeamData) return null;

  const teamPct = pct(myTeamData.spent, myTeamData.budget);
  const myCost  = myData?.total_cost ?? 0;
  const myCalls = myData?.total_calls ?? 0;

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
        <div className="stat-card"><span className="stat-value purple">${myCost.toFixed(2)}</span><span className="stat-label">내 오늘 사용량</span></div>
        <div className="stat-card"><span className="stat-value blue">{myCalls.toLocaleString()}건</span><span className="stat-label">내 오늘 호출 수</span></div>
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
          <p style={{ fontSize: 13, color: '#5f6368' }}>비용: ${myCost.toFixed(2)} / 호출: {myCalls.toLocaleString()}건</p>
        </div>
      </div>
    </>
  );
}

/* ── 메인 ── */
export default function QuotaControlPage() {
  const { user } = useUser();
  const [teams, setTeams]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [simulating, setSimulating]     = useState(false);
  const [companyBudget, setCompanyBudget] = useState(500);
  const [simTeams, setSimTeams]         = useState([]);
  const intervalRef = useRef(null);

  const fetchTeams = useCallback(async () => {
    try {
      const { data } = await api.get('/teams/');
      const normalized = data.map(normalizeTeam);
      setTeams(normalized);
      if (!simulating) setSimTeams(normalized);
    } catch (e) {
      console.error('fetch teams failed', e);
    } finally {
      setLoading(false);
    }
  }, [simulating]);

  useEffect(() => {
    fetchTeams();
  }, []);

  // Try to fetch overview budget for techlead
  useEffect(() => {
    if (user.role !== 'techlead' && user.role !== 'devops') return;
    api.get('/dashboard/overview/')
      .then(({ data }) => {
        if (data.company_budget) setCompanyBudget(data.company_budget);
      })
      .catch(() => {});
  }, [user.role]);

  const displayTeams = simulating ? simTeams : teams;

  const startSim = () => {
    setSimTeams(teams);
    setSimulating(true);
  };
  const stopSim  = () => {
    clearInterval(intervalRef.current);
    setSimulating(false);
    setSimTeams([]);
  };

  useEffect(() => {
    if (!simulating) return;
    intervalRef.current = setInterval(() => {
      setSimTeams((prev) => {
        const next = prev.map((t) => {
          if (t.providers.length === 0) return t;
          const allCapped = t.providers.every((p) => p.spent >= p.limit);
          if (t.spent >= t.budget || allCapped) return t;

          const inc = Math.random() * 2.5;
          const available = t.providers.filter((p) => p.spent < p.limit);
          const availTotal = available.reduce((s, p) => s + p.spent, 0);

          const newProviders = t.providers.map((p) => {
            if (p.spent >= p.limit) return p;
            const share = availTotal > 0 ? p.spent / availTotal : 1 / available.length;
            return { ...p, spent: Math.min(p.spent + inc * share, p.limit) };
          });

          const newSpent = Math.min(
            newProviders.reduce((s, p) => s + p.spent, 0),
            t.budget,
          );
          return { ...t, spent: newSpent, providers: newProviders };
        });

        const allDone = next.every((t) =>
          t.providers.length === 0 ||
          t.spent >= t.budget ||
          t.providers.every((p) => p.spent >= p.limit),
        );
        if (allDone) { clearInterval(intervalRef.current); setSimulating(false); }
        return next;
      });
    }, 120);
    return () => clearInterval(intervalRef.current);
  }, [simulating]);

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', fontSize: 15, color: '#5f6368' }}>
          데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  // For partlead/member: find their team by team_id
  const myTeamId = user.team_id ?? (displayTeams[0]?.id);

  return (
    <div className="page">
      {user.role === 'techlead' && (
        <TechLeadView
          teams={displayTeams}
          refetchTeams={fetchTeams}
          simulating={simulating}
          startSim={startSim}
          stopSim={stopSim}
          companyBudget={companyBudget}
          setCompanyBudget={setCompanyBudget}
        />
      )}
      {user.role === 'partlead' && (
        <PartLeadView teams={displayTeams} refetchTeams={fetchTeams} myTeamId={myTeamId} />
      )}
      {user.role === 'member' && (
        <MemberView teams={displayTeams} myTeamId={myTeamId} />
      )}
    </div>
  );
}

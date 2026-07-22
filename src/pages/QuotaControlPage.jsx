import { useState, useEffect, useRef } from 'react';

const INITIAL_TEAMS = [
  { id: 1, team: '프론트엔드팀', provider: 'OpenAI', model: 'GPT-4o', budget: 50, spent: 11.2 },
  { id: 2, team: '백엔드팀', provider: 'Anthropic', model: 'Claude 3.5', budget: 30, spent: 27.8 },
  { id: 3, team: '데이터팀', provider: 'OpenAI', model: 'GPT-4o', budget: 100, spent: 8.4 },
  { id: 4, team: 'QA팀', provider: 'OpenAI', model: 'GPT-4o-mini', budget: 20, spent: 18.1 },
];

function pct(spent, budget) {
  return Math.min((spent / budget) * 100, 100);
}

function statusOf(spent, budget) {
  const p = pct(spent, budget);
  if (p >= 100) return 'BLOCKED';
  if (p >= 80) return 'WARNING';
  return 'ACTIVE';
}

export default function QuotaControlPage() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [simulating, setSimulating] = useState(false);
  const intervalRef = useRef(null);

  const startSim = () => {
    setTeams(INITIAL_TEAMS);
    setSimulating(true);
  };

  const stopSim = () => {
    clearInterval(intervalRef.current);
    setSimulating(false);
  };

  useEffect(() => {
    if (!simulating) return;
    intervalRef.current = setInterval(() => {
      setTeams((prev) => {
        const next = prev.map((t) => ({
          ...t,
          spent: Math.min(t.spent + Math.random() * 2.5, t.budget),
        }));
        const allDone = next.every((t) => t.spent >= t.budget);
        if (allDone) {
          clearInterval(intervalRef.current);
          setSimulating(false);
        }
        return next;
      });
    }, 120);
    return () => clearInterval(intervalRef.current);
  }, [simulating]);

  const totalBudget = teams.reduce((s, t) => s + t.budget, 0);
  const totalSpent = teams.reduce((s, t) => s + t.spent, 0);
  const blocked = teams.filter((t) => statusOf(t.spent, t.budget) === 'BLOCKED').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">API 할당 제어</h1>
          <p className="page-sub">팀별 일일 예산을 설정하고 실시간 소비를 모니터링하세요</p>
        </div>
        <button
          className={`sim-btn ${simulating ? 'sim-btn--stop' : ''}`}
          onClick={simulating ? stopSim : startSim}
        >
          {simulating ? '⏹ 시뮬레이션 중지' : '⚡ 트래픽 폭주 시뮬레이션'}
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value blue">${totalBudget}</span>
          <span className="stat-label">오늘 총 할당 예산</span>
        </div>
        <div className="stat-card">
          <span className="stat-value orange">${totalSpent.toFixed(1)}</span>
          <span className="stat-label">오늘 총 소비</span>
        </div>
        <div className="stat-card">
          <span className={`stat-value ${blocked > 0 ? 'red' : 'green'}`}>{blocked}</span>
          <span className="stat-label">차단된 API</span>
        </div>
      </div>

      <div className="quota-table">
        <div className="quota-table-header">
          <span>팀</span>
          <span>제공사 / 모델</span>
          <span>일일 예산 한도 ($)</span>
          <span>오늘 소비</span>
          <span>상태</span>
        </div>

        {teams.map((t) => {
          const p = pct(t.spent, t.budget);
          const status = statusOf(t.spent, t.budget);
          return (
            <div
              key={t.id}
              className={`quota-row ${status === 'BLOCKED' ? 'quota-row--blocked' : ''}`}
            >
              <span className="quota-team">{t.team}</span>

              <span className="quota-provider">
                <span
                  className="provider-dot"
                  style={{ background: t.provider === 'OpenAI' ? '#10a37f' : '#d97757' }}
                />
                {t.provider} · {t.model}
              </span>

              <div className="quota-slider-wrap">
                <input
                  type="range"
                  min={10}
                  max={200}
                  value={t.budget}
                  className="quota-slider"
                  onChange={(e) =>
                    setTeams((prev) =>
                      prev.map((x) =>
                        x.id === t.id ? { ...x, budget: Number(e.target.value) } : x
                      )
                    )
                  }
                />
                <span className="quota-budget-val">${t.budget}</span>
              </div>

              <div className="quota-spent-wrap">
                <div className="quota-bar-bg">
                  <div
                    className={`quota-bar-fill ${p >= 100 ? 'fill--red' : p >= 80 ? 'fill--orange' : 'fill--green'}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
                <span className="quota-spent-label">
                  ${t.spent.toFixed(1)} ({p.toFixed(0)}%)
                </span>
              </div>

              <span className={`status-badge status--${status.toLowerCase()}`}>
                {status}
              </span>
            </div>
          );
        })}
      </div>

      {simulating && (
        <div className="sim-notice">
          ⚡ 트래픽 폭주 시뮬레이션 진행 중 — 예산 초과 시 즉시 BLOCKED 전이됩니다
        </div>
      )}
    </div>
  );
}

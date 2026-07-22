import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';

const INITIAL_TEAMS = [
  { id: 1, team: '프론트엔드팀', provider: 'OpenAI',    model: 'GPT-4o',      budget: 50,  spent: 11.2 },
  { id: 2, team: '백엔드팀',     provider: 'Anthropic', model: 'Claude 3.5',  budget: 30,  spent: 27.8 },
  { id: 3, team: '데이터팀',     provider: 'OpenAI',    model: 'GPT-4o',      budget: 100, spent: 8.4  },
  { id: 4, team: 'QA팀',         provider: 'OpenAI',    model: 'GPT-4o-mini', budget: 20,  spent: 18.1 },
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
};

function pct(spent, budget) { return Math.min((spent / budget) * 100, 100); }
function statusOf(spent, budget) {
  const p = pct(spent, budget);
  if (p >= 100) return 'BLOCKED';
  if (p >= 80)  return 'WARNING';
  return 'ACTIVE';
}

/* ── 테크리드 뷰 ── */
function TechLeadView({ teams, setTeams, simulating, startSim, stopSim }) {
  const totalBudget = teams.reduce((s, t) => s + t.budget, 0);
  const totalSpent  = teams.reduce((s, t) => s + t.spent, 0);
  const blocked     = teams.filter((t) => statusOf(t.spent, t.budget) === 'BLOCKED').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">API 할당 제어</h1>
          <p className="page-sub">전체 팀의 일일 예산을 설정하고 실시간 소비를 모니터링합니다</p>
        </div>
        <button className={`sim-btn ${simulating ? 'sim-btn--stop' : ''}`} onClick={simulating ? stopSim : startSim}>
          {simulating ? '⏹ 시뮬레이션 중지' : '⚡ 트래픽 폭주 시뮬레이션'}
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-card"><span className="stat-value blue">${totalBudget}</span><span className="stat-label">오늘 총 할당 예산</span></div>
        <div className="stat-card"><span className="stat-value orange">${totalSpent.toFixed(1)}</span><span className="stat-label">오늘 총 소비</span></div>
        <div className="stat-card"><span className={`stat-value ${blocked > 0 ? 'red' : 'green'}`}>{blocked}</span><span className="stat-label">차단된 API</span></div>
      </div>

      <div className="quota-table">
        <div className="quota-table-header">
          <span>팀</span><span>제공사 / 모델</span><span>일일 예산 한도 ($)</span><span>오늘 소비</span><span>상태</span>
        </div>
        {teams.map((t) => {
          const p = pct(t.spent, t.budget);
          const status = statusOf(t.spent, t.budget);
          return (
            <div key={t.id} className={`quota-row ${status === 'BLOCKED' ? 'quota-row--blocked' : ''}`}>
              <span className="quota-team">{t.team}</span>
              <span className="quota-provider">
                <span className="provider-dot" style={{ background: t.provider === 'OpenAI' ? '#10a37f' : '#d97757' }} />
                {t.provider} · {t.model}
              </span>
              <div className="quota-slider-wrap">
                <input type="range" min={10} max={200} value={t.budget} className="quota-slider"
                  onChange={(e) => setTeams((prev) => prev.map((x) => x.id === t.id ? { ...x, budget: Number(e.target.value) } : x))} />
                <span className="quota-budget-val">${t.budget}</span>
              </div>
              <div className="quota-spent-wrap">
                <div className="quota-bar-bg">
                  <div className={`quota-bar-fill ${p >= 100 ? 'fill--red' : p >= 80 ? 'fill--orange' : 'fill--green'}`} style={{ width: `${p}%` }} />
                </div>
                <span className="quota-spent-label">${t.spent.toFixed(1)} ({p.toFixed(0)}%)</span>
              </div>
              <span className={`status-badge status--${status.toLowerCase()}`}>{status}</span>
            </div>
          );
        })}
      </div>

      {/* 팀별 팀원 사용량 */}
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

      {/* 팀 전체 바 */}
      <div className="analytics-card" style={{ marginBottom: 24 }}>
        <div className="quota-bar-bg" style={{ height: 12, borderRadius: 6 }}>
          <div className={`quota-bar-fill ${p >= 100 ? 'fill--red' : p >= 80 ? 'fill--orange' : 'fill--green'}`} style={{ width: `${p}%`, height: '100%', borderRadius: 6 }} />
        </div>
        <p style={{ fontSize: 13, color: '#5f6368', marginTop: 8 }}>
          {myTeamData.provider} · {myTeamData.model} &nbsp;—&nbsp; ${myTeamData.spent.toFixed(1)} / ${myTeamData.budget}
        </p>
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
          <div className="quota-bar-bg" style={{ height: 12, borderRadius: 6 }}>
            <div className={`quota-bar-fill ${teamPct >= 80 ? 'fill--orange' : 'fill--green'}`} style={{ width: `${teamPct}%`, height: '100%', borderRadius: 6 }} />
          </div>
          <p style={{ fontSize: 13, color: '#5f6368', marginTop: 8 }}>${myTeamData.spent.toFixed(1)} / ${myTeamData.budget} ({teamPct.toFixed(0)}%)</p>
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
          const mp = pct(m.used, m.limit);
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
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [simulating, setSimulating] = useState(false);
  const intervalRef = useRef(null);

  const startSim = () => { setTeams(INITIAL_TEAMS); setSimulating(true); };
  const stopSim  = () => { clearInterval(intervalRef.current); setSimulating(false); };

  useEffect(() => {
    if (!simulating) return;
    intervalRef.current = setInterval(() => {
      setTeams((prev) => {
        const next = prev.map((t) => ({ ...t, spent: Math.min(t.spent + Math.random() * 2.5, t.budget) }));
        if (next.every((t) => t.spent >= t.budget)) { clearInterval(intervalRef.current); setSimulating(false); }
        return next;
      });
    }, 120);
    return () => clearInterval(intervalRef.current);
  }, [simulating]);

  return (
    <div className="page">
      {user.role === 'techlead' && (
        <TechLeadView teams={teams} setTeams={setTeams} simulating={simulating} startSim={startSim} stopSim={stopSim} />
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

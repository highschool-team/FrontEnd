import { useState, useEffect, useMemo } from 'react';
import { useIntegration } from '../context/IntegrationContext';
import { useUser } from '../context/UserContext';
import {
  ComposedChart, AreaChart, Area, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/index.js';

/* ── API period key mapping ── */
// UI uses 'daily'/'weekly'/'monthly', API uses 'day'/'week'/'month'
const PERIOD_API_KEY = { daily: 'day', weekly: 'week', monthly: 'month' };

const PERIODS = [
  { key: 'daily',   label: '일간', remainLabel: '남은 시간 예측' },
  { key: 'weekly',  label: '주간', remainLabel: '남은 요일 예측' },
  { key: 'monthly', label: '월간', remainLabel: '남은 일수 예측' },
];

/* ── 선형 회귀 ── */
function buildLinearRegression(values) {
  const n = values.length;
  if (n < 2) return () => values[0] ?? 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  const num = values.reduce((s, v, i) => s + (i - xMean) * (v - yMean), 0);
  const den = values.reduce((s, v, i) => s + (i - xMean) ** 2, 0);
  const m = den === 0 ? 0 : num / den;
  const b = yMean - m * xMean;
  return (x) => Math.max(0, m * x + b);
}

/* ── 커스텀 툴팁 ── */
const PredTooltip = ({ active, payload, label, isCost }) => {
  if (!active || !payload?.length) return null;
  const items = payload.filter(
    (p) => p.value != null && !['upper', 'lower'].includes(p.dataKey)
  );
  if (!items.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {items.map((p) => (
        <p key={p.dataKey} style={{ color: p.color ?? '#1a73e8' }}>
          {p.name}:{' '}
          {isCost ? `$${Number(p.value).toFixed(2)}` : `${Number(p.value).toLocaleString()}건`}
        </p>
      ))}
    </div>
  );
};

/* ── 파트장 뷰 ── */
function PartLeadAnalyticsView({ myTeamId, period, setPeriod }) {
  const [chartData, setChartData]   = useState([]);
  const [summary, setSummary]       = useState(null);
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!myTeamId) return;
    setLoading(true);
    Promise.all([
      api.get(`/teams/${myTeamId}/usage/`, { params: { period: PERIOD_API_KEY[period], metric: 'cost' } }),
      api.get(`/teams/${myTeamId}/members/usage/`),
    ]).then(([usageRes, membersRes]) => {
      const { chart_data, summary: s } = usageRes.data;
      const mapped = (chart_data?.labels ?? []).map((label, i) => ({
        name: label,
        호출량: 0,
        비용: chart_data.values[i] ?? 0,
      }));
      setChartData(mapped);
      setSummary(s);
      setMembers(membersRes.data.members ?? []);
    }).catch(() => {
      setChartData([]);
      setMembers([]);
    }).finally(() => setLoading(false));
  }, [myTeamId, period]);

  // Also fetch call counts
  useEffect(() => {
    if (!myTeamId) return;
    api.get(`/teams/${myTeamId}/usage/`, { params: { period: PERIOD_API_KEY[period], metric: 'calls' } })
      .then(({ data }) => {
        const callLabels = data.chart_data?.labels ?? [];
        const callValues = data.chart_data?.values ?? [];
        setChartData((prev) => prev.map((d, i) => ({
          ...d,
          호출량: callValues[i] ?? d.호출량,
        })));
      })
      .catch(() => {});
  }, [myTeamId, period]);

  const teamCalls = summary?.total_calls ?? members.reduce((s, m) => s + m.total_calls, 0);
  const teamCost  = summary?.total_cost  ?? members.reduce((s, m) => s + m.total_cost, 0);
  const topMember = [...members].sort((a, b) => b.total_calls - a.total_calls)[0];
  const memberBarData = members.map((m) => ({
    name: m.email.split('@')[0],
    사용량: m.total_calls ?? 0,
  }));

  const xInterval = period === 'monthly' ? 4 : period === 'daily' ? 2 : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">사용량 분석</h1>
          <p className="page-sub">팀 사용 패턴 및 팀원별 현황</p>
        </div>
        <div className="filter-tabs" style={{ margin: 0 }}>
          {PERIODS.map((p) => (
            <button key={p.key} className={`filter-tab ${period === p.key ? 'filter-tab--active' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><span className="stat-value blue">{(teamCalls ?? 0).toLocaleString()}</span><span className="stat-label">총 호출</span></div>
        <div className="stat-card"><span className="stat-value orange">${(teamCost ?? 0).toFixed(2)}</span><span className="stat-label">총 비용</span></div>
        <div className="stat-card"><span className="stat-value purple">{members.length}명</span><span className="stat-label">팀원 수</span></div>
        <div className="stat-card"><span className="stat-value green">{topMember ? topMember.email.split('@')[0] : '-'}</span><span className="stat-label">최다 사용 팀원</span></div>
      </div>

      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#5f6368', fontSize: 14 }}>차트 데이터 로딩 중...</div>
      ) : (
        <>
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h2 className="analytics-card-title">
                {period === 'daily' ? '시간대별' : period === 'weekly' ? '요일별' : '일자별'} 호출 패턴
              </h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} interval={xInterval} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }}
                  formatter={(v) => [`${v.toLocaleString()}건`, '팀 호출량']} />
                <Area type="monotone" dataKey="호출량" stroke="#1a73e8" strokeWidth={2} fill="url(#gradTeam)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {memberBarData.length > 0 && (
            <div className="analytics-card" style={{ marginTop: 20 }}>
              <div className="analytics-card-header">
                <h2 className="analytics-card-title">팀원별 API 호출 현황</h2>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={memberBarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip formatter={(v, name) => [`${v.toLocaleString()}건`, name]}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }} />
                  <Bar dataKey="사용량" fill="#1a73e8" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>

              <div className="member-table" style={{ marginTop: 20 }}>
                <div className="member-table-header">
                  <span>팀원</span><span>호출량</span><span>비용</span>
                </div>
                {members.map((m) => (
                  <div key={m.user_id} className="member-row">
                    <span className="member-name">
                      <span className="user-avatar">{m.email[0].toUpperCase()}</span>{m.email.split('@')[0]}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{(m.total_calls ?? 0).toLocaleString()}건</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>${(m.total_cost ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ── 팀원 뷰 ── */
function MemberAnalyticsView({ myTeamId, period, setPeriod }) {
  const { user } = useUser();
  const [chartData, setChartData] = useState([]);
  const [members, setMembers]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!myTeamId) return;
    setLoading(true);
    Promise.all([
      api.get(`/teams/${myTeamId}/usage/`, { params: { period: PERIOD_API_KEY[period], metric: 'calls' } }),
      api.get(`/teams/${myTeamId}/members/usage/`),
    ]).then(([usageRes, membersRes]) => {
      const { chart_data } = usageRes.data;
      const mapped = (chart_data?.labels ?? []).map((label, i) => ({
        name: label,
        사용량: chart_data.values[i] ?? 0,
      }));
      setChartData(mapped);
      setMembers(membersRes.data.members ?? []);
    }).catch(() => {
      setChartData([]);
    }).finally(() => setLoading(false));
  }, [myTeamId, period]);

  const me         = members.find((m) => m.email === user.email) ?? null;
  const myCalls    = me?.total_calls ?? 0;
  const myCost     = me?.total_cost  ?? 0;
  const teamCalls  = members.reduce((s, m) => s + (m.total_calls ?? 0), 0);
  const xInterval  = period === 'monthly' ? 4 : period === 'daily' ? 2 : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">사용량 분석</h1>
          <p className="page-sub">{user.email} · 개인 사용 현황</p>
        </div>
        <div className="filter-tabs" style={{ margin: 0 }}>
          {PERIODS.map((p) => (
            <button key={p.key} className={`filter-tab ${period === p.key ? 'filter-tab--active' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><span className="stat-value blue">{myCalls.toLocaleString()}</span><span className="stat-label">내 총 호출</span></div>
        <div className="stat-card"><span className="stat-value orange">${myCost.toFixed(2)}</span><span className="stat-label">내 총 비용</span></div>
        <div className="stat-card"><span className="stat-value blue">{teamCalls.toLocaleString()}</span><span className="stat-label">팀 전체 호출</span></div>
        <div className="stat-card">
          <span className="stat-value purple">{teamCalls > 0 ? ((myCalls / teamCalls) * 100).toFixed(1) : '0'}%</span>
          <span className="stat-label">팀 기여율</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#5f6368', fontSize: 14 }}>차트 데이터 로딩 중...</div>
      ) : (
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h2 className="analytics-card-title">
              {period === 'daily' ? '시간대별' : period === 'weekly' ? '요일별' : '일자별'} 팀 사용 패턴
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMember" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9334e6" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#9334e6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} interval={xInterval} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }}
                formatter={(v) => [`${v.toLocaleString()}건`, '호출량']} />
              <Area type="monotone" dataKey="사용량" stroke="#9334e6" strokeWidth={2} fill="url(#gradMember)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

/* ── 테크리드 뷰 ── */
function TechLeadAnalyticsView({ period, setPeriod, metric, setMetric }) {
  const { connected } = useIntegration();
  const [overview, setOverview]     = useState(null);
  const [chartData, setChartData]   = useState([]);
  const [allTeams, setAllTeams]     = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading]       = useState(true);

  // Fetch overview once
  useEffect(() => {
    api.get('/dashboard/overview/')
      .then(({ data }) => setOverview(data))
      .catch(() => {});
  }, []);

  // Fetch team list for team usage bar chart
  useEffect(() => {
    api.get('/teams/')
      .then(({ data }) => {
        setAllTeams(data);
        if (!selectedTeam && data.length > 0) setSelectedTeam(data[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch usage chart when period/metric/team changes
  useEffect(() => {
    if (!selectedTeam) return;
    setLoading(true);
    api.get(`/teams/${selectedTeam}/usage/`, {
      params: { period: PERIOD_API_KEY[period], metric: metric === 'cost' ? 'cost' : 'calls' }
    }).then(({ data }) => {
      const { chart_data } = data;
      const isCostMetric = metric === 'cost';
      const mapped = (chart_data?.labels ?? []).map((label, i) => ({
        name: label,
        총비용: isCostMetric ? (chart_data.values[i] ?? 0) : undefined,
        총호출: !isCostMetric ? (chart_data.values[i] ?? 0) : undefined,
      }));
      setChartData(mapped);
    }).catch(() => setChartData([]))
      .finally(() => setLoading(false));
  }, [selectedTeam, period, metric]);

  const isCost     = metric === 'cost';
  const periodObj  = PERIODS.find((p) => p.key === period);
  const xInterval  = period === 'monthly' ? 4 : period === 'daily' ? 2 : 0;
  const periodDesc = { daily: '오늘', weekly: '이번 주', monthly: '이번 달' }[period];

  const teamSummaryData = (overview?.teams_summary ?? []).map((t) => ({
    name: t.name,
    비용: t.spent ?? 0,
  }));

  // Build prediction data from chart series
  const nowIdx = Math.floor((chartData.length - 1) * 0.6);
  const dataKey = isCost ? '총비용' : '총호출';

  const { predChartData, predictedTotal, exceededAt, budget } = useMemo(() => {
    const values = chartData.map((d) => d[dataKey] ?? 0);
    if (values.length === 0) return { predChartData: [], predictedTotal: 0, exceededAt: null, budget: 0 };

    const actualValues = values.slice(0, nowIdx + 1);
    const predict = buildLinearRegression(actualValues);
    let cumulative = 0;
    let exceededAt = null;
    const totalSpent = overview?.total_spent ?? 0;
    const companyBudget = overview?.company_budget ?? 1;
    const bgt = isCost ? companyBudget : 100000;

    const data = chartData.map((d, i) => {
      const realVal = d[dataKey] ?? 0;
      const predVal = i > nowIdx ? predict(i) : realVal;
      cumulative += i <= nowIdx ? realVal : predVal;
      if (!exceededAt && cumulative >= bgt) exceededAt = d.name;
      if (i < nowIdx) return { name: d.name, actual: realVal };
      if (i === nowIdx) return { name: d.name, actual: realVal, predicted: realVal, upper: realVal * 1.12, lower: realVal * 0.88 };
      return { name: d.name, predicted: predVal, upper: predVal * 1.12, lower: predVal * 0.88 };
    });
    return { predChartData: data, predictedTotal: Math.round(cumulative), exceededAt, budget: bgt };
  }, [chartData, nowIdx, dataKey, isCost, overview]);

  const nowLabel  = predChartData[nowIdx]?.name;
  const lastLabel = predChartData[predChartData.length - 1]?.name;
  const isOver    = budget > 0 && predictedTotal >= budget;
  const usageRate = budget > 0 ? ((predictedTotal / budget) * 100).toFixed(1) : '0';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">사용량 분석</h1>
          <p className="page-sub">기간별 사용 패턴을 분석하고, 선형 회귀로 잔여 구간을 예측합니다</p>
        </div>
        <div className="filter-tabs" style={{ margin: 0 }}>
          {PERIODS.map((p) => (
            <button key={p.key} className={`filter-tab ${period === p.key ? 'filter-tab--active' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value blue">${(overview?.company_budget ?? 0).toLocaleString()}</span>
          <span className="stat-label">전체 예산</span>
        </div>
        <div className="stat-card">
          <span className="stat-value orange">${(overview?.total_spent ?? 0).toFixed(2)}</span>
          <span className="stat-label">총 소비</span>
        </div>
        <div className="stat-card">
          <span className="stat-value red">{overview?.blocked_teams ?? 0}</span>
          <span className="stat-label">차단된 팀</span>
        </div>
        <div className="stat-card">
          <span className="stat-value purple">{overview?.teams_summary?.length ?? 0}개</span>
          <span className="stat-label">운영 팀</span>
        </div>
        <div className="stat-card">
          <span className={`stat-value ${isOver ? 'red' : 'green'}`}>{usageRate}%</span>
          <span className="stat-label">예측 예산 사용률</span>
        </div>
      </div>

      {/* 팀 선택 + 사용 패턴 차트 */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">
            {period === 'daily' ? '시간대별' : period === 'weekly' ? '요일별' : '일자별'} 사용 패턴
          </h2>
          {allTeams.length > 0 && (
            <select
              value={selectedTeam ?? ''}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            >
              {allTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#5f6368', fontSize: 14 }}>차트 데이터 로딩 중...</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOAI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.22} /><stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} interval={xInterval} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => isCost ? `$${v}` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }}
                formatter={(v, name) => [isCost ? `$${Number(v).toFixed(2)}` : `${Number(v).toLocaleString()}건`, name]} />
              <Area type="monotone" dataKey={dataKey} stroke="#1a73e8" strokeWidth={2} fill="url(#gradOAI)" dot={false} activeDot={{ r: 4 }} name={isCost ? '총 비용' : '총 호출수'} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 예측 차트 */}
      {!loading && predChartData.length > 0 && (
        <div className="analytics-card" style={{ marginTop: 20 }}>
          <div className="analytics-card-header">
            <h2 className="analytics-card-title">
              {periodDesc} {periodObj.remainLabel}
              <span className="pred-subtitle">&nbsp;·&nbsp;선형 회귀 기반 &nbsp;·&nbsp; 신뢰 구간 ±12%</span>
            </h2>
            <div className="filter-tabs" style={{ margin: 0 }}>
              <button className={`filter-tab ${metric === 'calls' ? 'filter-tab--active' : ''}`} onClick={() => setMetric('calls')}>API 호출량</button>
              <button className={`filter-tab ${metric === 'cost'  ? 'filter-tab--active' : ''}`} onClick={() => setMetric('cost')}>비용 ($)</button>
            </div>
          </div>
          <div className={`pred-banner ${isOver ? 'pred-banner--warn' : 'pred-banner--ok'}`}>
            {isOver ? (
              <><strong>{exceededAt}</strong>에 예산 초과 예상 &nbsp;—&nbsp; 예측 총량 <strong>{isCost ? `$${predictedTotal}` : `${predictedTotal.toLocaleString()}건`}</strong></>
            ) : (
              <>✓ {periodDesc} 말까지 예산 내 유지 예상 &nbsp;—&nbsp; 예측 총량 <strong>{isCost ? `$${predictedTotal}` : `${predictedTotal.toLocaleString()}건`}</strong></>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={predChartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.2} /><stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
                </linearGradient>
              </defs>
              {nowLabel && lastLabel && <ReferenceArea x1={nowLabel} x2={lastLabel} fill="#f8f9fa" fillOpacity={0.9} />}
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} interval={xInterval} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => isCost ? `$${v}` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip content={<PredTooltip isCost={isCost} />} />
              <Line dataKey="upper" stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls={false} legendType="none" name="상한" />
              <Line dataKey="lower" stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls={false} legendType="none" name="하한" />
              <Area type="monotone" dataKey="actual" stroke="#1a73e8" strokeWidth={2} fill="url(#gradActual)" dot={false} connectNulls={false} activeDot={{ r: 4 }} name="actual" />
              <Line type="monotone" dataKey="predicted" stroke="#1a73e8" strokeWidth={2} strokeDasharray="7 4" dot={false} connectNulls={false} strokeOpacity={0.75} activeDot={{ r: 4 }} name="predicted" />
              {nowLabel && (
                <ReferenceLine x={nowLabel} stroke="#5f6368" strokeWidth={1.5} strokeDasharray="4 3"
                  label={{ value: '지금', position: 'insideTopRight', fontSize: 11, fill: '#5f6368', dy: -4 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="pred-legend-note">
            <span className="legend-line legend-solid" /> 실제 데이터
            <span className="legend-line legend-dashed" /> 예측 (선형 회귀)
            <span className="legend-line legend-conf" /> 신뢰 구간 ±12%
            <span className="legend-bg" /> 예측 구간
          </div>
        </div>
      )}

      {/* 팀별 소비 현황 */}
      {teamSummaryData.length > 0 && (
        <div className="analytics-card" style={{ marginTop: 20 }}>
          <div className="analytics-card-header">
            <h2 className="analytics-card-title">팀별 누적 비용</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={teamSummaryData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, '비용']}
                contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }} />
              <Bar dataKey="비용" fill="#1a73e8" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

/* ── 메인 ── */
export default function AnalyticsPage() {
  const { user } = useUser();
  const [period, setPeriod] = useState('daily');
  const [metric, setMetric] = useState('calls');

  const myTeamId = user.team_id ?? null;

  return (
    <div className="page">
      {(user.role === 'techlead' || user.role === 'devops') && (
        <TechLeadAnalyticsView period={period} setPeriod={setPeriod} metric={metric} setMetric={setMetric} />
      )}
      {user.role === 'partlead' && (
        <PartLeadAnalyticsView myTeamId={myTeamId} period={period} setPeriod={setPeriod} />
      )}
      {user.role === 'member' && (
        <MemberAnalyticsView myTeamId={myTeamId} period={period} setPeriod={setPeriod} />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useIntegration } from '../context/IntegrationContext';
import { useUser } from '../context/UserContext';
import {
  ComposedChart, AreaChart, Area, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ReferenceArea,
  ResponsiveContainer,
} from 'recharts';

/* ── 전체 목업 데이터 ── */
const DAILY = Array.from({ length: 24 }, (_, i) => {
  const isWork = i >= 9 && i <= 18;
  const isPeak = i === 10 || i === 14 || i === 16;
  const mult = isPeak ? 1.6 : isWork ? 1 : i >= 19 ? 0.35 : 0.1;
  return {
    name: `${i}시`,
    OpenAI: Math.round(mult * 380 + 30),
    Anthropic: Math.round(mult * 220 + 15),
    Gemini: Math.round(mult * 170 + 12),
    비용: parseFloat((mult * 3.8 + 0.3).toFixed(2)),
  };
});

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const WEEKLY = WEEK_DAYS.map((d, i) => {
  const isWeekend = i >= 5;
  const mult = isWeekend ? 0.18 : [1, 1.25, 1.1, 1.3, 0.9][i] ?? 1;
  return {
    name: d,
    OpenAI: Math.round(mult * 5800 + 400),
    Anthropic: Math.round(mult * 3200 + 200),
    Gemini: Math.round(mult * 2400 + 160),
    비용: parseFloat((mult * 56 + 4).toFixed(1)),
  };
});

const MONTHLY = Array.from({ length: 30 }, (_, i) => {
  const dayOfWeek = (i + 2) % 7;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const trend = 1 + i * 0.015;
  const mult = isWeekend ? 0.2 : trend;
  return {
    name: `${i + 1}일`,
    OpenAI: Math.round(mult * 6200 + 500),
    Anthropic: Math.round(mult * 3500 + 250),
    Gemini: Math.round(mult * 2700 + 190),
    비용: parseFloat((mult * 60 + 5).toFixed(1)),
  };
});

const TEAM_DATA = [
  { name: '프론트엔드팀',  OpenAI: 12400, Anthropic: 3100,  Gemini: 5800 },
  { name: '백엔드팀',      OpenAI: 8200,  Anthropic: 11300, Gemini: 2100 },
  { name: '데이터팀',      OpenAI: 21500, Anthropic: 4800,  Gemini: 9300 },
  { name: 'QA팀',          OpenAI: 3100,  Anthropic: 900,   Gemini: 1400 },
  { name: '모바일 앱 팀',  OpenAI: 2800,  Anthropic: 6200,  Gemini: 1100 },
];

const PERIODS = [
  { key: 'daily',   label: '일간', data: DAILY,   remainLabel: '남은 시간 예측' },
  { key: 'weekly',  label: '주간', data: WEEKLY,  remainLabel: '남은 요일 예측' },
  { key: 'monthly', label: '월간', data: MONTHLY, remainLabel: '남은 일수 예측' },
];

const NOW_IDX = { daily: 14, weekly: 2, monthly: 14 };

const BUDGETS = {
  daily:   { calls: 44000,   cost: 150 },
  weekly:  { calls: 240000,  cost: 850 },
  monthly: { calls: 1100000, cost: 3800 },
};

/* ── 파트장/팀원 전용 데이터 ── */
const TEAM_MEMBER_USAGE = {
  '프론트엔드팀': [
    { name: '박팀원', calls: 3200,  cost: 3.8,  callLimit: 12500, costLimit: 12.5 },
    { name: '김수진', calls: 4100,  cost: 4.9,  callLimit: 12500, costLimit: 12.5 },
    { name: '최현우', calls: 1000,  cost: 1.2,  callLimit: 12500, costLimit: 12.5 },
    { name: '정다은', calls: 1100,  cost: 1.3,  callLimit: 12500, costLimit: 12.5 },
  ],
  '백엔드팀': [
    { name: '이영희', calls: 9800,  cost: 12.1, callLimit: 10000, costLimit: 10 },
    { name: '윤재원', calls: 7200,  cost: 8.9,  callLimit: 10000, costLimit: 10 },
    { name: '강민서', calls: 5500,  cost: 6.8,  callLimit: 10000, costLimit: 10 },
  ],
  '데이터팀': [
    { name: '홍길동', calls: 28000, cost: 5.1,  callLimit: 33300, costLimit: 33.3 },
    { name: '임채원', calls: 17400, cost: 3.3,  callLimit: 33300, costLimit: 33.3 },
  ],
  'QA팀': [
    { name: '김철수', calls: 9200,  cost: 9.8,  callLimit: 10000, costLimit: 10 },
    { name: '이민지', calls: 7800,  cost: 8.3,  callLimit: 10000, costLimit: 10 },
  ],
  '모바일 앱 팀': [
    { name: '송지훈', calls: 2600,  cost: 3.1,  callLimit: 13300, costLimit: 13.3 },
    { name: '배수연', calls: 2000,  cost: 2.4,  callLimit: 13300, costLimit: 13.3 },
    { name: '오태양', calls: 1000,  cost: 1.2,  callLimit: 13300, costLimit: 13.3 },
  ],
};

const TEAM_RATIO = {
  '프론트엔드팀': 0.24,
  '백엔드팀':     0.20,
  '데이터팀':     0.35,
  'QA팀':         0.11,
  '모바일 앱 팀': 0.10,
};

const MEMBER_RATIO = {
  '박팀원': 0.033, '김수진': 0.042, '최현우': 0.010, '정다은': 0.011,
  '이영희': 0.090, '윤재원': 0.066, '강민서': 0.051,
  '홍길동': 0.090, '임채원': 0.054,
  '김철수': 0.085, '이민지': 0.072,
  '송지훈': 0.028, '배수연': 0.022, '오태양': 0.011,
};

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
function PartLeadAnalyticsView({ myTeam, period, setPeriod }) {
  const members    = TEAM_MEMBER_USAGE[myTeam] ?? [];
  const teamRatio  = TEAM_RATIO[myTeam] ?? 0.25;
  const teamCalls  = members.reduce((s, m) => s + m.calls, 0);
  const teamCost   = members.reduce((s, m) => s + m.cost, 0);
  const topMember  = [...members].sort((a, b) => b.calls - a.calls)[0];

  const periodObj  = PERIODS.find((p) => p.key === period);
  const rawData    = periodObj.data;
  const xInterval  = period === 'monthly' ? 4 : period === 'daily' ? 2 : 0;

  const teamData = rawData.map((d) => ({
    name: d.name,
    호출량: Math.round((d.OpenAI + d.Anthropic + d.Gemini) * teamRatio),
    비용: parseFloat((d.비용 * teamRatio).toFixed(2)),
  }));

  const memberBarData = members.map((m) => ({
    name: m.name,
    사용량: m.calls,
    '개인 한도': m.callLimit,
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">사용량 분석</h1>
          <p className="page-sub">{myTeam} · 팀 사용 패턴 및 팀원별 현황</p>
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
        <div className="stat-card"><span className="stat-value blue">{teamCalls.toLocaleString()}</span><span className="stat-label">팀 오늘 총 호출</span></div>
        <div className="stat-card"><span className="stat-value orange">${teamCost.toFixed(1)}</span><span className="stat-label">팀 오늘 비용</span></div>
        <div className="stat-card"><span className="stat-value purple">{members.length}명</span><span className="stat-label">팀원 수</span></div>
        <div className="stat-card"><span className="stat-value green">{topMember?.name ?? '-'}</span><span className="stat-label">최다 사용 팀원</span></div>
      </div>

      {/* 팀 사용 패턴 */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">
            {myTeam} · {period === 'daily' ? '시간대별' : period === 'weekly' ? '요일별' : '일자별'} 호출 패턴
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={teamData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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

      {/* 팀원별 사용량 */}
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
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" iconSize={8} />
            <Bar dataKey="개인 한도" fill="#e8f0fe" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="사용량"    fill="#1a73e8" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>

        {/* 팀원 상세 테이블 */}
        <div className="member-table" style={{ marginTop: 20 }}>
          <div className="member-table-header">
            <span>팀원</span><span>호출량</span><span>비용</span><span>한도 소진율</span>
          </div>
          {members.map((m) => {
            const p = Math.min((m.calls / m.callLimit) * 100, 100);
            return (
              <div key={m.name} className="member-row">
                <span className="member-name">
                  <span className="user-avatar">{m.name[0]}</span>{m.name}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.calls.toLocaleString()}건</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>${m.cost.toFixed(1)}</span>
                <div className="quota-spent-wrap">
                  <div className="quota-bar-bg" style={{ minWidth: 80 }}>
                    <div className={`quota-bar-fill ${p >= 80 ? 'fill--orange' : 'fill--green'}`} style={{ width: `${p}%` }} />
                  </div>
                  <span className="quota-spent-label">{p.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ── 팀원 뷰 ── */
function MemberAnalyticsView({ myTeam, myName, period, setPeriod }) {
  const memberRatio = MEMBER_RATIO[myName] ?? 0.03;
  const periodObj   = PERIODS.find((p) => p.key === period);
  const rawData     = periodObj.data;
  const xInterval   = period === 'monthly' ? 4 : period === 'daily' ? 2 : 0;

  const myData = rawData.map((d) => ({
    name: d.name,
    사용량: Math.round((d.OpenAI + d.Anthropic + d.Gemini) * memberRatio),
  }));

  const memberInfo  = Object.values(TEAM_MEMBER_USAGE).flat().find((m) => m.name === myName);
  const myCalls     = memberInfo?.calls ?? 0;
  const myCost      = memberInfo?.cost ?? 0;
  const myCallLimit = memberInfo?.callLimit ?? 1;
  const myCostLimit = memberInfo?.costLimit ?? 0;
  const remaining   = Math.max(myCostLimit - myCost, 0);
  const usagePct    = Math.min((myCalls / myCallLimit) * 100, 100);

  const members    = TEAM_MEMBER_USAGE[myTeam] ?? [];
  const teamCalls  = members.reduce((s, m) => s + m.calls, 0);
  const teamLimit  = members.reduce((s, m) => s + m.callLimit, 0);
  const teamPct    = teamLimit > 0 ? Math.min((teamCalls / teamLimit) * 100, 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">사용량 분석</h1>
          <p className="page-sub">{myName} · 개인 사용 현황</p>
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
        <div className="stat-card"><span className="stat-value blue">{myCalls.toLocaleString()}</span><span className="stat-label">내 오늘 총 호출</span></div>
        <div className="stat-card"><span className="stat-value orange">${myCost.toFixed(1)}</span><span className="stat-label">내 오늘 비용</span></div>
        <div className="stat-card"><span className="stat-value green">${remaining.toFixed(1)}</span><span className="stat-label">내 잔여 비용 한도</span></div>
        <div className="stat-card">
          <span className={`stat-value ${teamPct >= 80 ? 'orange' : 'blue'}`}>{teamPct.toFixed(0)}%</span>
          <span className="stat-label">팀 예산 소진율</span>
        </div>
      </div>

      {/* 내 한도 소진 현황 */}
      <div className="analytics-card" style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>내 한도 소진 현황</p>
        <div className="quota-bar-bg" style={{ height: 12, borderRadius: 6 }}>
          <div className={`quota-bar-fill ${usagePct >= 80 ? 'fill--orange' : 'fill--green'}`}
            style={{ width: `${usagePct}%`, height: '100%', borderRadius: 6 }} />
        </div>
        <p style={{ fontSize: 13, color: '#5f6368', marginTop: 8 }}>
          {myCalls.toLocaleString()}건 / {myCallLimit.toLocaleString()}건 &nbsp;({usagePct.toFixed(0)}%)
        </p>
      </div>

      {/* 내 시간대별 사용 패턴 */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">
            {period === 'daily' ? '시간대별' : period === 'weekly' ? '요일별' : '일자별'} 내 사용 패턴
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={myData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
              formatter={(v) => [`${v.toLocaleString()}건`, '내 호출량']} />
            <Area type="monotone" dataKey="사용량" stroke="#9334e6" strokeWidth={2} fill="url(#gradMember)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ── 테크리드 뷰 ── */
function TechLeadAnalyticsView({ period, setPeriod, metric, setMetric }) {
  const { connected } = useIntegration();
  const showOpenAI    = connected.has('openai');
  const showAnthropic = connected.has('claude');
  const showGemini    = connected.has('gemini');

  const periodObj = PERIODS.find((p) => p.key === period);
  const rawData   = periodObj.data;
  const nowIdx    = NOW_IDX[period];
  const isCost    = metric === 'cost';
  const budget    = BUDGETS[period][metric];

  const { predChartData, predictedTotal, exceededAt } = useMemo(() => {
    const getVal = (d) => isCost
      ? d.비용
      : (showOpenAI ? d.OpenAI : 0) + (showAnthropic ? d.Anthropic : 0) + (showGemini ? d.Gemini : 0);
    const actualValues = rawData.slice(0, nowIdx + 1).map(getVal);
    const predict = buildLinearRegression(actualValues);
    const CONF = 0.12;
    let cumulative = 0;
    let exceededAt = null;
    const data = rawData.map((d, i) => {
      const realVal = getVal(d);
      const predVal = i > nowIdx ? predict(i) : realVal;
      cumulative += i <= nowIdx ? realVal : predVal;
      if (!exceededAt && cumulative >= budget) exceededAt = d.name;
      if (i < nowIdx) return { name: d.name, actual: realVal };
      if (i === nowIdx) return { name: d.name, actual: realVal, predicted: realVal, upper: realVal * 1.12, lower: realVal * 0.88 };
      return { name: d.name, predicted: predVal, upper: predVal * 1.12, lower: predVal * 0.88 };
    });
    return { predChartData: data, predictedTotal: Math.round(cumulative), exceededAt };
  }, [period, metric, rawData, nowIdx, isCost, budget, showOpenAI, showAnthropic, showGemini]);

  const nowLabel    = rawData[nowIdx].name;
  const lastLabel   = rawData[rawData.length - 1].name;
  const isOver      = predictedTotal >= budget;
  const usageRate   = ((predictedTotal / budget) * 100).toFixed(1);
  const periodDesc  = { daily: '오늘', weekly: '이번 주', monthly: '이번 달' }[period];
  const totalCalls  = rawData.reduce((s, d) =>
    s + (showOpenAI ? d.OpenAI : 0) + (showAnthropic ? d.Anthropic : 0) + (showGemini ? d.Gemini : 0), 0);
  const totalCost   = rawData.reduce((s, d) => s + d.비용, 0);
  const peakOpenAI  = Math.max(...rawData.map((d) => d.OpenAI));
  const peakPoint   = rawData.find((d) => d.OpenAI === peakOpenAI)?.name ?? '-';
  const xInterval   = period === 'monthly' ? 4 : period === 'daily' ? 2 : 0;

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
          <span className="stat-value blue">{totalCalls.toLocaleString()}</span>
          <span className="stat-label">{periodDesc} 총 호출 (전체 기간)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value orange">${totalCost.toFixed(1)}</span>
          <span className="stat-label">누적 비용 (전체 기간)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value red">{peakPoint}</span>
          <span className="stat-label">OpenAI 피크 시점</span>
        </div>
        <div className="stat-card">
          <span className="stat-value purple">
            {totalCalls > 0 && showGemini
              ? ((rawData.reduce((s, d) => s + d.Gemini, 0) / totalCalls) * 100).toFixed(1) + '%'
              : '—'}
          </span>
          <span className="stat-label">Gemini 비중</span>
        </div>
        <div className="stat-card">
          <span className={`stat-value ${isOver ? 'red' : 'green'}`}>{usageRate}%</span>
          <span className="stat-label">예측 예산 사용률</span>
        </div>
      </div>

      {/* 사용 패턴 차트 */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">
            {period === 'daily' ? '시간대별' : period === 'weekly' ? '요일별' : '일자별'} 사용 패턴
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={rawData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOAI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.22} /><stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradANT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97757" stopOpacity={0.22} /><stop offset="95%" stopColor="#d97757" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGEM" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} interval={xInterval} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }}
              formatter={(v, name) => [`${v.toLocaleString()}건`, name]} />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" iconSize={8} />
            {showOpenAI    && <Area type="monotone" dataKey="OpenAI"    stroke="#1a73e8" strokeWidth={2} fill="url(#gradOAI)" dot={false} activeDot={{ r: 4 }} />}
            {showAnthropic && <Area type="monotone" dataKey="Anthropic" stroke="#d97757" strokeWidth={2} fill="url(#gradANT)" dot={false} activeDot={{ r: 4 }} />}
            {showGemini    && <Area type="monotone" dataKey="Gemini"    stroke="#7c3aed" strokeWidth={2} fill="url(#gradGEM)" dot={false} activeDot={{ r: 4 }} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 예측 차트 */}
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
            <><strong>{exceededAt}</strong>에 예산 초과 예상 &nbsp;—&nbsp; 예측 총량 <strong>{isCost ? `$${predictedTotal}` : `${predictedTotal.toLocaleString()}건`}</strong> / 예산 <strong>{isCost ? `$${budget}` : `${budget.toLocaleString()}건`}</strong></>
          ) : (
            <>✓ {periodDesc} 말까지 예산 내 유지 예상 &nbsp;—&nbsp; 예측 총량 <strong>{isCost ? `$${predictedTotal}` : `${predictedTotal.toLocaleString()}건`}</strong> / 예산 <strong>{isCost ? `$${budget}` : `${budget.toLocaleString()}건`}</strong></>
          )}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={predChartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.2} /><stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <ReferenceArea x1={nowLabel} x2={lastLabel} fill="#f8f9fa" fillOpacity={0.9} />
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} interval={xInterval} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => isCost ? `$${v}` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<PredTooltip isCost={isCost} />} />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" iconSize={8}
              formatter={(value) => value === 'actual' ? '실제 사용량' : value === 'predicted' ? '예측' : value} />
            <Line dataKey="upper" stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls={false} legendType="none" name="상한" />
            <Line dataKey="lower" stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3" dot={false} connectNulls={false} legendType="none" name="하한" />
            <Area type="monotone" dataKey="actual" stroke="#1a73e8" strokeWidth={2} fill="url(#gradActual)" dot={false} connectNulls={false} activeDot={{ r: 4 }} name="actual" />
            <Line type="monotone" dataKey="predicted" stroke="#1a73e8" strokeWidth={2} strokeDasharray="7 4" dot={false} connectNulls={false} strokeOpacity={0.75} activeDot={{ r: 4 }} name="predicted" />
            <ReferenceLine x={nowLabel} stroke="#5f6368" strokeWidth={1.5} strokeDasharray="4 3"
              label={{ value: '지금', position: 'insideTopRight', fontSize: 11, fill: '#5f6368', dy: -4 }} />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="pred-legend-note">
          <span className="legend-line legend-solid" /> 실제 데이터
          <span className="legend-line legend-dashed" /> 예측 (선형 회귀)
          <span className="legend-line legend-conf" /> 신뢰 구간 ±12%
          <span className="legend-bg" /> 예측 구간
        </div>
      </div>

      {/* 팀별 사용량 */}
      <div className="analytics-card" style={{ marginTop: 20 }}>
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">팀별 누적 호출량</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={TEAM_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v, name) => [`${v.toLocaleString()}건`, name]}
              contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" iconSize={8} />
            {showOpenAI    && <Bar dataKey="OpenAI"    fill="#1a73e8" radius={[4, 4, 0, 0]} maxBarSize={32} />}
            {showAnthropic && <Bar dataKey="Anthropic" fill="#d97757" radius={[4, 4, 0, 0]} maxBarSize={32} />}
            {showGemini    && <Bar dataKey="Gemini"    fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={32} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ── 메인 ── */
export default function AnalyticsPage() {
  const { user } = useUser();
  const [period, setPeriod] = useState('daily');
  const [metric, setMetric] = useState('calls');

  return (
    <div className="page">
      {(user.role === 'techlead' || user.role === 'devops') && (
        <TechLeadAnalyticsView period={period} setPeriod={setPeriod} metric={metric} setMetric={setMetric} />
      )}
      {user.role === 'partlead' && (
        <PartLeadAnalyticsView myTeam={user.team} period={period} setPeriod={setPeriod} />
      )}
      {user.role === 'member' && (
        <MemberAnalyticsView myTeam={user.team} myName={user.memberName} period={period} setPeriod={setPeriod} />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  ComposedChart, AreaChart, Area, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ReferenceArea,
  ResponsiveContainer,
} from 'recharts';

/* ── 목업 데이터 ── */
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
  { name: '프론트엔드팀', OpenAI: 12400, Anthropic: 3100, Gemini: 5800 },
  { name: '백엔드팀', OpenAI: 8200, Anthropic: 11300, Gemini: 2100 },
  { name: '데이터팀', OpenAI: 21500, Anthropic: 4800, Gemini: 9300 },
  { name: 'QA팀', OpenAI: 3100, Anthropic: 900, Gemini: 1400 },
];

const PERIODS = [
  { key: 'daily', label: '일간', data: DAILY, remainLabel: '남은 시간 예측' },
  { key: 'weekly', label: '주간', data: WEEKLY, remainLabel: '남은 요일 예측' },
  { key: 'monthly', label: '월간', data: MONTHLY, remainLabel: '남은 일수 예측' },
];

/* NOW 기준점: 일간=14시, 주간=수요일(2), 월간=15일(14) */
const NOW_IDX = { daily: 14, weekly: 2, monthly: 14 };

/* 기간별 예산 상한 */
const BUDGETS = {
  daily:   { calls: 44000,   cost: 150 },
  weekly:  { calls: 240000,  cost: 850 },
  monthly: { calls: 1100000, cost: 3800 },
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('daily');
  const [metric, setMetric] = useState('calls');

  const periodObj = PERIODS.find((p) => p.key === period);
  const rawData = periodObj.data;
  const nowIdx = NOW_IDX[period];
  const isCost = metric === 'cost';
  const budget = BUDGETS[period][metric];

  /* ── 예측 데이터 계산 ── */
  const { predChartData, predictedTotal, exceededAt, actualSoFar } = useMemo(() => {
    const getVal = (d) => isCost ? d.비용 : d.OpenAI + d.Anthropic + d.Gemini;
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

      if (i < nowIdx) {
        return { name: d.name, actual: realVal };
      }
      if (i === nowIdx) {
        return {
          name: d.name,
          actual: realVal,
          predicted: realVal,
          upper: realVal * (1 + CONF),
          lower: realVal * (1 - CONF),
        };
      }
      return {
        name: d.name,
        predicted: predVal,
        upper: predVal * (1 + CONF),
        lower: predVal * (1 - CONF),
      };
    });

    const actualSoFar = rawData.slice(0, nowIdx + 1).reduce((s, d) => s + getVal(d), 0);
    return { predChartData: data, predictedTotal: Math.round(cumulative), exceededAt, actualSoFar };
  }, [period, metric, rawData, nowIdx, isCost, budget]);

  const nowLabel = rawData[nowIdx].name;
  const lastLabel = rawData[rawData.length - 1].name;
  const isOver = predictedTotal >= budget;
  const usageRate = ((predictedTotal / budget) * 100).toFixed(1);

  /* 기간 설명 */
  const periodDesc = { daily: '오늘', weekly: '이번 주', monthly: '이번 달' }[period];
  const totalCalls = rawData.reduce((s, d) => s + d.OpenAI + d.Anthropic + d.Gemini, 0);
  const totalCost = rawData.reduce((s, d) => s + d.비용, 0);
  const peakOpenAI = Math.max(...rawData.map((d) => d.OpenAI));
  const peakPoint = rawData.find((d) => d.OpenAI === peakOpenAI)?.name ?? '-';

  /* X축 간격 */
  const xInterval = period === 'monthly' ? 4 : period === 'daily' ? 2 : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">사용량 분석</h1>
          <p className="page-sub">기간별 사용 패턴을 분석하고, 선형 회귀로 잔여 구간을 예측합니다</p>
        </div>
        {/* 기간 토글 */}
        <div className="filter-tabs" style={{ margin: 0 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`filter-tab ${period === p.key ? 'filter-tab--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 스탯 카드 ── */}
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
            {((rawData.reduce((s, d) => s + d.Gemini, 0) / totalCalls) * 100).toFixed(1)}%
          </span>
          <span className="stat-label">Gemini 비중</span>
        </div>
        <div className="stat-card">
          <span className={`stat-value ${isOver ? 'red' : 'green'}`}>{usageRate}%</span>
          <span className="stat-label">예측 예산 사용률</span>
        </div>
      </div>

      {/* ── 1. 사용 패턴 차트 (기존) ── */}
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
                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradANT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97757" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#d97757" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGEM" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} interval={xInterval} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }}
              formatter={(v, name) => [`${v.toLocaleString()}건`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="OpenAI" stroke="#1a73e8" strokeWidth={2} fill="url(#gradOAI)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="Anthropic" stroke="#d97757" strokeWidth={2} fill="url(#gradANT)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="Gemini" stroke="#7c3aed" strokeWidth={2} fill="url(#gradGEM)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── 2. 예측 차트 ── */}
      <div className="analytics-card" style={{ marginTop: 20 }}>
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">
            {periodDesc} {periodObj.remainLabel}
            <span className="pred-subtitle">
              &nbsp;·&nbsp;선형 회귀 기반 &nbsp;·&nbsp; 신뢰 구간 ±12%
            </span>
          </h2>
          <div className="filter-tabs" style={{ margin: 0 }}>
            <button
              className={`filter-tab ${metric === 'calls' ? 'filter-tab--active' : ''}`}
              onClick={() => setMetric('calls')}
            >
              API 호출량
            </button>
            <button
              className={`filter-tab ${metric === 'cost' ? 'filter-tab--active' : ''}`}
              onClick={() => setMetric('cost')}
            >
              비용 ($)
            </button>
          </div>
        </div>

        {/* 예측 인사이트 배너 */}
        <div className={`pred-banner ${isOver ? 'pred-banner--warn' : 'pred-banner--ok'}`}>
          {isOver ? (
            <>
              ⚠ <strong>{exceededAt}</strong>에 예산 초과 예상
              &nbsp;—&nbsp; 예측 총량{' '}
              <strong>{isCost ? `$${predictedTotal}` : `${predictedTotal.toLocaleString()}건`}</strong>
              &nbsp;/ 예산{' '}
              <strong>{isCost ? `$${budget}` : `${budget.toLocaleString()}건`}</strong>
            </>
          ) : (
            <>
              ✓ {periodDesc} 말까지 예산 내 유지 예상
              &nbsp;—&nbsp; 예측 총량{' '}
              <strong>{isCost ? `$${predictedTotal}` : `${predictedTotal.toLocaleString()}건`}</strong>
              &nbsp;/ 예산{' '}
              <strong>{isCost ? `$${budget}` : `${budget.toLocaleString()}건`}</strong>
            </>
          )}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={predChartData} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* 예측 구간 배경 */}
            <ReferenceArea x1={nowLabel} x2={lastLabel} fill="#f8f9fa" fillOpacity={0.9} />

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#80868b' }}
              interval={xInterval}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#80868b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                isCost ? `$${v}` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
              }
            />
            <Tooltip content={<PredTooltip isCost={isCost} />} />
            <Legend
              wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => {
                if (value === 'actual') return '실제 사용량';
                if (value === 'predicted') return '예측';
                return value;
              }}
            />

            {/* 신뢰 구간 — 얇은 점선 */}
            <Line dataKey="upper" stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3"
              dot={false} connectNulls={false} legendType="none" name="상한" />
            <Line dataKey="lower" stroke="#93c5fd" strokeWidth={1} strokeDasharray="3 3"
              dot={false} connectNulls={false} legendType="none" name="하한" />

            {/* 실제 데이터 영역 */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#1a73e8"
              strokeWidth={2}
              fill="url(#gradActual)"
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4 }}
              name="actual"
            />

            {/* 예측 점선 */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#1a73e8"
              strokeWidth={2}
              strokeDasharray="7 4"
              dot={false}
              connectNulls={false}
              strokeOpacity={0.75}
              activeDot={{ r: 4 }}
              name="predicted"
            />

            {/* 지금 기준선 */}
            <ReferenceLine
              x={nowLabel}
              stroke="#5f6368"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: '지금', position: 'insideTopRight', fontSize: 11, fill: '#5f6368', dy: -4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* 범례 보조 설명 */}
        <div className="pred-legend-note">
          <span className="legend-line legend-solid" /> 실제 데이터
          <span className="legend-line legend-dashed" /> 예측 (선형 회귀)
          <span className="legend-line legend-conf" /> 신뢰 구간 ±12%
          <span className="legend-bg" /> 예측 구간
        </div>
      </div>

      {/* ── 3. 팀별 사용량 ── */}
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
            <Tooltip
              formatter={(v, name) => [`${v.toLocaleString()}건`, name]}
              contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} iconType="circle" iconSize={8} />
            <Bar dataKey="OpenAI" fill="#1a73e8" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Anthropic" fill="#d97757" radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="Gemini" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

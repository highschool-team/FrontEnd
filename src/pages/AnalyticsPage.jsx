import { useState } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
    비용: parseFloat((mult * 60 + 5).toFixed(1)),
  };
});

const TEAM_DATA = [
  { name: '프론트엔드팀', OpenAI: 12400, Anthropic: 3100 },
  { name: '백엔드팀', OpenAI: 8200, Anthropic: 11300 },
  { name: '데이터팀', OpenAI: 21500, Anthropic: 4800 },
  { name: 'QA팀', OpenAI: 3100, Anthropic: 900 },
];

const PERIODS = [
  { key: 'daily', label: '일간', data: DAILY },
  { key: 'weekly', label: '주간', data: WEEKLY },
  { key: 'monthly', label: '월간', data: MONTHLY },
];

const METRICS = [
  { key: 'calls', label: 'API 호출량' },
  { key: 'cost', label: '비용 ($)' },
];

const CUSTOM_TOOLTIP = ({ active, payload, label, metric }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {metric === 'cost' ? `$${p.value}` : `${p.value.toLocaleString()}건`}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('daily');
  const [metric, setMetric] = useState('calls');

  const periodObj = PERIODS.find((p) => p.key === period);
  const data = periodObj.data;

  const totalCalls = data.reduce((s, d) => s + d.OpenAI + d.Anthropic, 0);
  const totalCost = data.reduce((s, d) => s + d.비용, 0);
  const peakOpenAI = Math.max(...data.map((d) => d.OpenAI));
  const peakPoint = data.find((d) => d.OpenAI === peakOpenAI)?.name ?? '-';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">사용량 분석</h1>
          <p className="page-sub">기간별 API 호출 패턴과 비용 추이를 분석하세요</p>
        </div>
      </div>

      {/* 요약 스탯 */}
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value blue">{totalCalls.toLocaleString()}</span>
          <span className="stat-label">
            {period === 'daily' ? '오늘' : period === 'weekly' ? '이번 주' : '이번 달'} 총 호출
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-value orange">${totalCost.toFixed(1)}</span>
          <span className="stat-label">누적 비용</span>
        </div>
        <div className="stat-card">
          <span className="stat-value red">{peakPoint}</span>
          <span className="stat-label">OpenAI 피크 시점</span>
        </div>
        <div className="stat-card">
          <span className="stat-value green">
            {((data.reduce((s, d) => s + d.Anthropic, 0) / totalCalls) * 100).toFixed(1)}%
          </span>
          <span className="stat-label">Anthropic 비중</span>
        </div>
      </div>

      {/* 메인 트렌드 차트 */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">
            {period === 'daily' ? '시간대별' : period === 'weekly' ? '요일별' : '일자별'} 사용 패턴
          </h2>
          <div className="chart-controls">
            <div className="filter-tabs" style={{ margin: 0 }}>
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  className={`filter-tab ${metric === m.key ? 'filter-tab--active' : ''}`}
                  onClick={() => setMetric(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
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
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOpenAI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAnthropic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97757" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#d97757" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#80868b' }}
              interval={period === 'monthly' ? 4 : period === 'daily' ? 2 : 0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#80868b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => metric === 'cost' ? `$${v}` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            />
            <Tooltip content={<CUSTOM_TOOLTIP metric={metric} />} />
            <Legend
              wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />
            {metric === 'calls' ? (
              <>
                <Area type="monotone" dataKey="OpenAI" stroke="#1a73e8" strokeWidth={2} fill="url(#gradOpenAI)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="Anthropic" stroke="#d97757" strokeWidth={2} fill="url(#gradAnthropic)" dot={false} activeDot={{ r: 4 }} />
              </>
            ) : (
              <Area type="monotone" dataKey="비용" stroke="#f9ab00" strokeWidth={2} fill="url(#gradOpenAI)" dot={false} activeDot={{ r: 4 }} name="비용 ($)" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 팀별 사용량 바 차트 */}
      <div className="analytics-card" style={{ marginTop: 20 }}>
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">팀별 누적 호출량</h2>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={TEAM_DATA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#80868b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v, name) => [`${v.toLocaleString()}건`, name]}
              contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} iconType="circle" iconSize={8} />
            <Bar dataKey="OpenAI" fill="#1a73e8" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Anthropic" fill="#d97757" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

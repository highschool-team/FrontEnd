import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/index.js';
import './Dashboard.css';

/* ── 팀 메타 ── */
const MOCK_TEAMS = [
  { id: 'front',  name: '프론트팀',   color: '#60a5fa' },
  { id: 'back',   name: '백엔드팀',   color: '#f472b6' },
  { id: 'data',   name: '데이터팀',   color: '#4ade80' },
  { id: 'qa',     name: 'QA팀',       color: '#fb923c' },
  { id: 'mobile', name: '모바일앱팀', color: '#a78bfa' },
];

/*
 * 실제 관측값만 저장 (_p 없음)
 * 예측값은 최소제곱법 선형 회귀(linReg)로 런타임 계산
 * daily  : 시간당 사용액 ($/h), joinIdx=18 (18시 = 현재)
 * weekly : 일별 사용액 ($),    joinIdx=5  (토 = 현재)
 * monthly: 주별 사용액 ($),    joinIdx=7  (8주 = 현재)
 */
const RAW_DATA = {
  daily: {
    labels: ['00시','01시','02시','03시','04시','05시','06시','07시','08시','09시','10시','11시','12시','13시','14시','15시','16시','17시','18시','19시','20시','21시','22시','23시'],
    joinIdx: 18,
    front:  [0.3,0.2,0.1,0.1,0.2,0.4,0.8,1.6,3.5,5.2,5.8,6.1,3.8,5.5,6.8,7.0,6.2,5.0,3.8],
    back:   [0.4,0.2,0.1,0.1,0.3,0.6,1.2,2.2,4.8,7.1,8.0,8.4,5.2,7.6,9.3,9.6,8.5,6.9,5.2],
    data:   [0.2,0.1,0.1,0.1,0.1,0.3,0.6,1.2,2.6,3.9,4.4,4.6,2.9,4.2,5.1,5.3,4.7,3.8,2.9],
    qa:     [0.1,0.1,0.0,0.0,0.1,0.2,0.4,0.8,1.8,2.6,2.9,3.1,1.9,2.8,3.4,3.6,3.2,2.5,1.9],
    mobile: [0.3,0.2,0.1,0.1,0.2,0.4,0.7,1.4,3.1,4.6,5.2,5.4,3.4,4.9,6.0,6.2,5.5,4.4,3.3],
  },
  weekly: {
    labels: ['월','화','수','목','금','토','일'],
    joinIdx: 5,
    front:  [58,72,66,50,70,5],
    back:   [78,97,89,68,94,7],
    data:   [35,44,40,30,42,3],
    qa:     [22,28,26,20,28,2],
    mobile: [48,60,55,42,57,4],
  },
  monthly: {
    labels: ['1주','2주','3주','4주','5주','6주','7주','8주','9주','10주','11주'],
    joinIdx: 7,
    front:  [240,258,270,282,278,280,281,282],
    back:   [320,342,360,375,370,372,374,375],
    data:   [145,158,168,178,174,176,177,178],
    qa:     [ 96,104,112,118,116,117,118,118],
    mobile: [198,214,226,236,232,234,235,236],
  },
};

/* 최소제곱법 선형 회귀: y = a·x + b (x = 인덱스 0,1,2,...) */
function linReg(ys) {
  const n = ys.length;
  if (n < 2) return () => ys[n - 1] ?? 0;
  const sumX  = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY  = ys.reduce((s, v) => s + v, 0);
  const sumXY = ys.reduce((s, v, i) => s + i * v, 0);
  const denom = n * sumX2 - sumX ** 2;
  if (denom === 0) return () => sumY / n;
  const a = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;
  return (x) => Math.max(0, +(a * x + b).toFixed(2));
}

/* 실제 + 선형회귀 예측 차트 데이터 생성 */
function buildChartData(periodKey) {
  const raw = RAW_DATA[periodKey];
  const { labels, joinIdx } = raw;
  const ids = MOCK_TEAMS.map(t => t.id);
  const preds = Object.fromEntries(ids.map(id => [id, linReg(raw[id])]));
  return labels.map((w, i) => {
    const row = { w };
    ids.forEach(id => {
      if (i <= joinIdx) row[`${id}_a`] = raw[id][i];
      if (i >= joinIdx) row[`${id}_p`] = i === joinIdx ? raw[id][i] : preds[id](i);
    });
    return row;
  });
}

/* 팀 상태 바용 현재 소비/예산 */
const PERIOD_META = {
  daily:   [
    { id: 'front',  spent: '$62.4',  budget: '$70/일',    pct: 89 },
    { id: 'back',   spent: '$85.7',  budget: '$100/일',   pct: 86 },
    { id: 'data',   spent: '$47.1',  budget: '$55/일',    pct: 86 },
    { id: 'qa',     spent: '$31.4',  budget: '$40/일',    pct: 79 },
    { id: 'mobile', spent: '$55.4',  budget: '$65/일',    pct: 85 },
  ],
  weekly:  [
    { id: 'front',  spent: '$321',   budget: '$420/주',   pct: 76 },
    { id: 'back',   spent: '$433',   budget: '$560/주',   pct: 77 },
    { id: 'data',   spent: '$194',   budget: '$315/주',   pct: 62 },
    { id: 'qa',     spent: '$126',   budget: '$210/주',   pct: 60 },
    { id: 'mobile', spent: '$266',   budget: '$350/주',   pct: 76 },
  ],
  monthly: [
    { id: 'front',  spent: '$1,121', budget: '$1,680/월', pct: 67 },
    { id: 'back',   spent: '$1,491', budget: '$2,240/월', pct: 67 },
    { id: 'data',   spent: '$705',   budget: '$1,260/월', pct: 56 },
    { id: 'qa',     spent: '$469',   budget: '$840/월',   pct: 56 },
    { id: 'mobile', spent: '$937',   budget: '$1,400/월', pct: 67 },
  ],
};

/* Y축 도메인 */
const PERIOD_DOMAIN = {
  daily:   [0, 12],
  weekly:  [0, 110],
  monthly: [0, 430],
};

/* ── 팀별 모델 사용 비율 ── */
const TEAM_MODEL_USAGE = [
  { id: 'front',  models: [{ name: 'Claude', pct: 68, color: '#fbbf24' }, { name: 'Gemini', pct: 32, color: '#34d399' }] },
  { id: 'back',   models: [{ name: 'Claude', pct: 75, color: '#fbbf24' }, { name: 'GPT-4o', pct: 25, color: '#f472b6' }] },
  { id: 'data',   models: [{ name: 'Claude', pct: 45, color: '#fbbf24' }, { name: 'Gemini', pct: 35, color: '#34d399' }, { name: 'GPT-4o', pct: 20, color: '#f472b6' }] },
  { id: 'qa',     models: [{ name: 'Claude', pct: 80, color: '#fbbf24' }, { name: 'Gemini', pct: 20, color: '#34d399' }] },
  { id: 'mobile', models: [{ name: 'Claude', pct: 55, color: '#fbbf24' }, { name: 'GPT-4o', pct: 45, color: '#f472b6' }] },
];
const DEFAULT_LIMITS = { front: 70, back: 100, data: 55, qa: 40, mobile: 65 };

const MEMBER_USAGE = {
  front:  [
    { name: '김민준', claude: '0.38M', gemini: '0.32M', gpt4o: '—',    cost: '$16.8', pct: 27 },
    { name: '이서연', claude: '0.31M', gemini: '0.28M', gpt4o: '—',    cost: '$13.9', pct: 22 },
    { name: '박지호', claude: '0.42M', gemini: '0.35M', gpt4o: '—',    cost: '$18.2', pct: 29 },
    { name: '최유진', claude: '0.29M', gemini: '0.17M', gpt4o: '—',    cost: '$13.5', pct: 22 },
  ],
  back:   [
    { name: '정도현', claude: '0.62M', gemini: '—',    gpt4o: '0.24M', cost: '$24.8', pct: 29 },
    { name: '한수민', claude: '0.54M', gemini: '—',    gpt4o: '0.20M', cost: '$21.6', pct: 25 },
    { name: '오재원', claude: '0.58M', gemini: '—',    gpt4o: '0.18M', cost: '$22.3', pct: 26 },
    { name: '윤채린', claude: '0.36M', gemini: '—',    gpt4o: '0.14M', cost: '$17.0', pct: 20 },
  ],
  data:   [
    { name: '송민호', claude: '0.28M', gemini: '0.22M', gpt4o: '0.18M', cost: '$16.2', pct: 34 },
    { name: '임지수', claude: '0.34M', gemini: '0.25M', gpt4o: '0.16M', cost: '$18.5', pct: 39 },
    { name: '강태양', claude: '0.28M', gemini: '0.23M', gpt4o: '0.16M', cost: '$12.4', pct: 26 },
  ],
  qa:     [
    { name: '조하늘', claude: '0.38M', gemini: '0.14M', gpt4o: '—',    cost: '$11.8', pct: 38 },
    { name: '백지훈', claude: '0.42M', gemini: '0.18M', gpt4o: '—',    cost: '$13.2', pct: 42 },
    { name: '신예은', claude: '0.30M', gemini: '0.08M', gpt4o: '—',    cost: '$6.4',  pct: 20 },
  ],
  mobile: [
    { name: '류성민', claude: '0.24M', gemini: '—',    gpt4o: '0.22M', cost: '$16.8', pct: 30 },
    { name: '권나래', claude: '0.28M', gemini: '—',    gpt4o: '0.26M', cost: '$20.1', pct: 36 },
    { name: '문현우', claude: '0.16M', gemini: '—',    gpt4o: '0.12M', cost: '$12.2', pct: 22 },
    { name: '노지은', claude: '0.12M', gemini: '—',    gpt4o: '0.09M', cost: '$6.3',  pct: 11 },
  ],
};

/* ── 툴팁 ── */
function ChartTooltip({ active, payload, label, meta }) {
  if (!active || !payload?.length) return null;
  const seen = new Set();
  const items = payload
    .filter(p => p.value != null)
    .map(p => {
      const id = p.dataKey.replace(/_[ap]$/, '');
      if (seen.has(id)) return null;
      seen.add(id);
      const team  = MOCK_TEAMS.find(t => t.id === id);
      const spent = meta.find(m => m.id === id)?.spent ?? '';
      return { name: team?.name ?? id, color: p.color, value: p.value, pred: p.dataKey.endsWith('_p'), spent };
    })
    .filter(Boolean);

  return (
    <div className="db-tt">
      <p className="db-tt-label">{label}</p>
      {items.map(({ name, color, value, pred, spent }) => (
        <p key={name} style={{ color }}>
          {name}{pred ? ' (예측)' : ''}: <strong>${value}</strong>
        </p>
      ))}
    </div>
  );
}

/* ── main ── */
export default function DashboardPage() {
  const navigate  = useNavigate();
  const [period, setPeriod]     = useState('monthly');
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get('/dashboard/overview/').then(({ data }) => setOverview(data)).catch(() => {});
  }, []);

  const [limits, setLimits]         = useState(DEFAULT_LIMITS);
  const [editingId, setEditingId]   = useState(null);
  const [draftLimit, setDraftLimit] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('front');

  const chartData = buildChartData(period);
  const meta      = PERIOD_META[period];
  const [, yMax]  = PERIOD_DOMAIN[period];
  const { labels, joinIdx } = RAW_DATA[period];
  const joinLabel = labels[joinIdx];

  return (
    <div className="db-root">
      {/* ── Header ── */}
      <header className="db-header">
        <div>
          <h1 className="db-brand">FinOps Guard</h1>
          <p className="db-brand-sub">사내 AI 사용 모니터링 · 비용 하드레일 · 보안 오프보딩 통합 대시보드</p>
        </div>
        <div className="db-header-right">
          <span className="db-live-badge">● LIVE</span>
          <button className="db-close-btn" onClick={() => navigate('/manage')} title="닫기">✕</button>
        </div>
      </header>

      <div className="db-body">
        <div className="db-top-grid">

          {/* ── 통합 사용량 & 예측 차트 ── */}
          <div className="db-card">
            <div className="db-card-head">
              <div>
                <p className="db-card-eyebrow">
                  {period === 'daily' ? '시간당 사용액 ($/h)' : period === 'weekly' ? '일별 사용액 ($)' : '주별 사용액 ($)'}
                  {' · 실선 = 실제, 점선 = 선형 회귀 예측'}
                </p>
                <p className="db-card-title">팀별 누적 AI API 비용</p>
              </div>
              {/* 기간 필터 */}
              <div className="db-period-tabs">
                {[['daily','일'],['weekly','주'],['monthly','월']].map(([k, l]) => (
                  <button
                    key={k}
                    className={`db-period-tab ${period === k ? 'db-period-tab--active' : ''}`}
                    onClick={() => setPeriod(k)}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* ── 팀별 현재 예산 상태 바 ── */}
            <div className="db-team-status-grid">
              {MOCK_TEAMS.map(t => {
                const m = meta.find(x => x.id === t.id);
                const pct = m?.pct ?? 0;
                const zoneColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#22c55e';
                const zoneName  = pct >= 100 ? '초과' : pct >= 80 ? '주의' : '안전';
                return (
                  <div key={t.id} className="db-team-status-card">
                    <div className="db-team-status-header">
                      <span className="db-legend-dot" style={{ background: t.color }} />
                      <span className="db-team-status-name" style={{ color: t.color }}>{t.name}</span>
                      <span className="db-team-status-zone" style={{ color: zoneColor }}>{zoneName}</span>
                    </div>
                    <div className="db-team-status-bar-bg">
                      <div
                        className="db-team-status-bar-fill"
                        style={{ width: `${Math.min(pct, 100)}%`, background: zoneColor }}
                      />
                    </div>
                    <div className="db-team-status-meta">
                      <span style={{ color: zoneColor, fontWeight: 700 }}>{pct}%</span>
                      <span style={{ color: '#475569' }}>{m?.spent} / {m?.budget}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="db-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 28, right: 24, left: -4, bottom: 0 }}
                >
                  <defs>
                    {MOCK_TEAMS.map(t => (
                      <linearGradient key={t.id} id={`grad_${t.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={t.color} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={t.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#131325" />
                  <XAxis
                    dataKey="w"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false} tickLine={false}
                    interval={period === 'daily' ? 2 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `$${v}`}
                    domain={[0, yMax]}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip meta={meta} />} />

                  {/* 현재 시점 구분선 */}
                  <ReferenceLine
                    x={joinLabel}
                    stroke="#334155" strokeWidth={1.4} strokeDasharray="3 3"
                    label={{ value: '현재', position: 'insideTopRight', fontSize: 10, fill: '#64748b', dy: -12 }}
                  />

                  {/* 실제 데이터: Area */}
                  {MOCK_TEAMS.map(t => (
                    <Area
                      key={`${t.id}_a`}
                      type="monotone"
                      dataKey={`${t.id}_a`}
                      stroke={t.color}
                      strokeWidth={2}
                      fill={`url(#grad_${t.id})`}
                      dot={false}
                      activeDot={{ r: 4, fill: t.color, stroke: '#07070f', strokeWidth: 2 }}
                      connectNulls={false}
                    />
                  ))}

                  {/* 예측 데이터: 점선 Line */}
                  {MOCK_TEAMS.map(t => (
                    <Line
                      key={`${t.id}_p`}
                      type="monotone"
                      dataKey={`${t.id}_p`}
                      stroke={t.color}
                      strokeWidth={1.8}
                      strokeDasharray="6 3"
                      strokeOpacity={0.65}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 팀 범례 */}
            <div className="db-team-legend" style={{ marginTop: 8 }}>
              {MOCK_TEAMS.map(t => {
                const m = meta.find(x => x.id === t.id);
                return (
                  <span key={t.id} className="db-legend-item">
                    <span className="db-legend-dot" style={{ background: t.color }} />
                    <span style={{ color: t.color, fontWeight: 700 }}>{t.name}</span>
                    <span style={{ color: '#475569', fontSize: 10 }}>
                      &nbsp;{m?.spent} / {m?.budget}
                      {m?.blocked ? ' · 차단됨' : ''}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* 이벤트 요약 */}
            <div className="db-alert-bar">
              <span>자동 차단 <strong style={{ color: '#f87171' }}>1건</strong></span>
              <span className="db-alert-sep">·</span>
              <span>모델 다운그레이드 <strong style={{ color: '#fb923c' }}>2건</strong></span>
              <span className="db-alert-sep">·</span>
              <span>전체 예산 <strong style={{ color: '#4ade80' }}>${(overview?.company_budget ?? 1330)}</strong></span>
              <span className="db-alert-sep">·</span>
              <span>총 소비 <strong style={{ color: '#fb923c' }}>${(overview?.total_spent ?? 933)}</strong></span>
            </div>
          </div>

          {/* ── 팀 모델 사용량 & 한도 설정 ── */}
          <div className="db-card">
            <div className="db-card-head">
              <div>
                <p className="db-card-eyebrow">모델별 사용 비율 · 일일 예산 한도</p>
                <p className="db-card-title">팀 모델 사용량 & 한도 설정</p>
              </div>
            </div>

            <div className="db-team-model-list">
              {MOCK_TEAMS.map(t => {
                const usage    = TEAM_MODEL_USAGE.find(u => u.id === t.id);
                const isEditing = editingId === t.id;
                const limit    = limits[t.id];
                return (
                  <div key={t.id} className="db-team-model-row">
                    <div className="db-team-model-header">
                      <span className="db-legend-dot" style={{ background: t.color }} />
                      <span className="db-team-model-name" style={{ color: t.color }}>{t.name}</span>
                      {isEditing ? (
                        <div className="db-limit-ctrl">
                          <span style={{ fontSize: 11, color: '#475569' }}>$</span>
                          <input
                            className="db-limit-input"
                            type="number"
                            value={draftLimit}
                            onChange={e => setDraftLimit(e.target.value)}
                            autoFocus
                          />
                          <span style={{ fontSize: 11, color: '#475569' }}>/일</span>
                          <button
                            className="db-limit-btn db-limit-btn--save"
                            onClick={() => {
                              setLimits(prev => ({ ...prev, [t.id]: +draftLimit || prev[t.id] }));
                              setEditingId(null);
                            }}
                          >저장</button>
                        </div>
                      ) : (
                        <div className="db-limit-ctrl">
                          <span className="db-limit-value">
                            ${limit}<span style={{ fontSize: 10, color: '#475569' }}>/일</span>
                          </span>
                          <button
                            className="db-limit-btn"
                            onClick={() => { setEditingId(t.id); setDraftLimit(String(limit)); }}
                          >편집</button>
                        </div>
                      )}
                    </div>
                    <div className="db-model-bar-wrap">
                      {usage.models.map(m => (
                        <div
                          key={m.name}
                          className="db-model-bar-seg"
                          style={{ width: `${m.pct}%`, background: m.color }}
                          title={`${m.name}: ${m.pct}%`}
                        />
                      ))}
                    </div>
                    <div className="db-model-labels">
                      {usage.models.map(m => (
                        <span key={m.name} className="db-model-label" style={{ color: m.color }}>
                          ■ {m.name} {m.pct}%
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 팀원별 사용량 ── */}
        <div className="db-card">
          <div className="db-card-head">
            <div>
              <p className="db-card-eyebrow">오늘 기준 · 팀원 AI 사용 내역</p>
              <p className="db-card-title">팀원별 사용량</p>
            </div>
            <div className="db-team-filter">
              {MOCK_TEAMS.map(t => (
                <button
                  key={t.id}
                  className={`db-team-filter-btn ${selectedTeam === t.id ? 'db-team-filter-btn--active' : ''}`}
                  style={selectedTeam === t.id ? { borderColor: t.color + '88', color: t.color } : {}}
                  onClick={() => setSelectedTeam(t.id)}
                >{t.name}</button>
              ))}
            </div>
          </div>
          <div className="db-table-scroll">
            <div className="db-member-head">
              <span>이름</span>
              <span>Claude 토큰</span>
              <span>Gemini 토큰</span>
              <span>GPT-4o 토큰</span>
              <span>오늘 사용액</span>
              <span>팀 예산 기여율</span>
            </div>
            {MEMBER_USAGE[selectedTeam].map(m => {
              const teamColor = MOCK_TEAMS.find(t => t.id === selectedTeam)?.color ?? '#60a5fa';
              return (
                <div key={m.name} className="db-member-row">
                  <span className="db-emp-name">{m.name}</span>
                  <span style={{ color: '#fbbf24' }}>{m.claude}</span>
                  <span style={{ color: m.gemini === '—' ? '#334155' : '#34d399' }}>{m.gemini}</span>
                  <span style={{ color: m.gpt4o  === '—' ? '#334155' : '#f472b6' }}>{m.gpt4o}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'Courier New' }}>{m.cost}</span>
                  <span>
                    <div className="db-pct-bar">
                      <div className="db-pct-fill" style={{ width: `${m.pct}%`, background: teamColor }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{m.pct}%</span>
                  </span>
                </div>
              );
            })}
          </div>
          {(() => {
            const tm = PERIOD_META.daily.find(m => m.id === selectedTeam);
            const members = MEMBER_USAGE[selectedTeam];
            return (
              <div className="db-alert-bar">
                <span>팀원 <strong style={{ color: '#e2e8f0' }}>{members.length}명</strong></span>
                <span className="db-alert-sep">·</span>
                <span>오늘 팀 총 사용액 <strong style={{ color: '#4ade80' }}>{tm?.spent}</strong></span>
                <span className="db-alert-sep">·</span>
                <span>일일 예산 <strong style={{ color: '#e2e8f0' }}>{tm?.budget}</strong></span>
                <span className="db-alert-sep">·</span>
                <span>사용률 <strong style={{ color: tm?.pct >= 85 ? '#fb923c' : '#4ade80' }}>{tm?.pct}%</strong></span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
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
    front:  [0.3,0.2,0.1,0.1,0.2,0.4,0.8,1.6,3.5,5.2,5.8,6.1,3.8,5.5,6.8,15.2,21.4,19.8,14.6],
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
  daily:   [0, 24],
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

const ALL_MODEL_TYPES = [
  { id: 'claude',  name: 'Claude',  color: '#d97757', logo: 'AC', models: [
    { id: 'claude-opus-4',   label: 'Opus 4',      tier: '고가' },
    { id: 'claude-sonnet-4', label: 'Sonnet 4',    tier: '중가' },
    { id: 'claude-haiku-4',  label: 'Haiku 4',     tier: '저가' },
  ]},
  { id: 'gpt4o',   name: 'GPT-4o',  color: '#10a37f', logo: 'OA', models: [
    { id: 'gpt-4o',          label: 'GPT-4o',      tier: '고가' },
    { id: 'gpt-4o-mini',     label: 'GPT-4o mini', tier: '저가' },
  ]},
  { id: 'gemini',  name: 'Gemini',  color: '#7c3aed', logo: 'GM', models: [
    { id: 'gemini-2.5-pro',  label: '2.5 Pro',     tier: '고가' },
    { id: 'gemini-1.5-pro',  label: '1.5 Pro',     tier: '중가' },
    { id: 'gemini-2.0-flash',label: '2.0 Flash',   tier: '저가' },
  ]},
];

const TIER_COLOR = { '고가': '#f87171', '중가': '#fb923c', '저가': '#4ade80' };

// 팀별 기본 허용 모델 (세부 모델 ID 단위)
const DEFAULT_ALLOWED_MODELS = {
  front:  new Set(['claude-sonnet-4', 'claude-haiku-4', 'gemini-1.5-flash']),
  back:   new Set(['claude-opus-4', 'claude-sonnet-4', 'gpt-4o', 'gpt-4o-mini']),
  data:   new Set(['claude-sonnet-4', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gpt-4o-mini']),
  qa:     new Set(['claude-haiku-4', 'gemini-1.5-flash']),
  mobile: new Set(['claude-sonnet-4', 'gpt-4o-mini']),
};

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
  const [period, setPeriod]     = useState('daily');
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get('/dashboard/overview/').then(({ data }) => setOverview(data)).catch(() => {});
  }, []);

  const [selectedTeam, setSelectedTeam] = useState('front');

  const [limits, setLimits]         = useState(DEFAULT_LIMITS);
  const [editingId, setEditingId]   = useState(null);
  const [draftLimit, setDraftLimit] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [allowedModels, setAllowedModels] = useState(DEFAULT_ALLOWED_MODELS);

  const toggleModel = (teamId, modelId) => {
    setAllowedModels(prev => {
      const next = new Set(prev[teamId]);
      next.has(modelId) ? next.delete(modelId) : next.add(modelId);
      return { ...prev, [teamId]: next };
    });
  };

  // ── 시뮬레이션 ──
  const [simProgress, setSimProgress] = useState(0);
  const [blockedTeams, setBlockedTeams] = useState(new Set());
  const [incidentAlert, setIncidentAlert] = useState(false);

  // 페이지 진입 시 자동 시작
  useEffect(() => {
    const tid = setInterval(() => {
      setSimProgress(p => {
        const next = +(p + 0.008).toFixed(4);
        if (next >= 1) { clearInterval(tid); return 1; }
        return next;
      });
    }, 50);
    return () => clearInterval(tid);
  }, []);

  const SIM_END        = { front: 152, back: 71, data: 68, qa: 73, mobile: 70 };
  const DAILY_BUDGETS  = { front: 70, back: 100, data: 55, qa: 40, mobile: 65 };

  // 예산 바: 0에서 최종값까지 채워짐
  const liveMeta = PERIOD_META[period].map(m => {
    if (period !== 'daily') return m;
    const end    = SIM_END[m.id];
    const pct    = Math.min(Math.round(end * simProgress), 100);
    const budget = DAILY_BUDGETS[m.id];
    const cost   = +(budget * pct / 100).toFixed(1);
    return { ...m, pct, spent: `$${cost}` };
  });

  // 예산 초과 팀 차단 감지 + 인시던트 감지
  useEffect(() => {
    if (period !== 'daily') return;
    liveMeta.forEach(m => {
      if (m.pct >= 100 && !blockedTeams.has(m.id)) {
        setBlockedTeams(prev => new Set([...prev, m.id]));
      }
    });
    // 15시 이후 프론트팀 급증 감지 (simCurrentIdx >= 15)
    if (simProgress >= 0.625 && !incidentAlert) {
      setIncidentAlert(true);
    }
  }, [simProgress]);

  const fullChartData = buildChartData(period);
  const { labels, joinIdx } = RAW_DATA[period];

  // clip-path로 좌→우 공개: 데이터 고정이므로 곡선 모양 불변
  const simCurrentIdx  = Math.floor(simProgress * labels.length);
  const chartClipRight = ((1 - simProgress) * 100).toFixed(2); // 오른쪽 숨김 %
  const liveJoinLabel  = simCurrentIdx <= joinIdx
    ? labels[Math.max(simCurrentIdx - 1, 0)]
    : labels[joinIdx];

  const meta         = liveMeta;
  const [, yMax]     = PERIOD_DOMAIN[period];
  const joinLabel    = liveJoinLabel;
  const blockedCount = blockedTeams.size;

  return (
    <div className="page db-root" style={{ maxWidth: 1600 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI 현황</h1>
          <p className="page-sub">사내 AI 사용 모니터링 · 비용 하드레일 · 팀별 한도 관리</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {blockedCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: '#f8717118', border: '1px solid #f8717144', borderRadius: 20, padding: '2px 10px' }}>
              ⚠ {blockedCount}팀 차단
            </span>
          )}
          <span className="db-live-badge" style={{ opacity: simProgress < 1 ? 1 : 0.5 }}>
            {simProgress < 1 ? '● LIVE' : '● 완료'}
          </span>
        </div>
      </div>

      {/* 1단계: 이상 징후 감지 */}
      {incidentAlert && (
        <div style={{
          background: '#12100a', border: '1px solid #fb923c44', borderLeft: '3px solid #fb923c',
          borderRadius: 8, padding: '10px 16px', marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fb923c' }}>프론트팀 API 호출 이상 감지 · </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              15시 이후 요청량 급증 — 모델 미지정으로 기본값 <strong style={{ color: '#fbbf24' }}>Claude Opus 4</strong> 적용 중. 로컬 환경 문제로 오인한 반복 재시도가 비용을 누적시키고 있습니다.
            </span>
          </div>
        </div>
      )}
      {/* 2단계: 예산 초과 자동 차단 */}
      {blockedTeams.size > 0 && (
        <div style={{
          background: '#1a0a0a', border: '1px solid #f8717144', borderLeft: '3px solid #f87171',
          borderRadius: 8, padding: '10px 16px', marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>예산 초과 자동 차단 · </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {[...blockedTeams].map(id => MOCK_TEAMS.find(t => t.id === id)?.name).join(', ')}이(가) 일일 한도를 초과하여 API 호출이 차단되었습니다.
            </span>
          </div>
        </div>
      )}

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
                const isBlocked = blockedTeams.has(t.id);
                const zoneColor = isBlocked ? '#ef4444' : pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#22c55e';
                const zoneName  = isBlocked ? '차단' : pct >= 100 ? '초과' : pct >= 80 ? '주의' : '안전';
                return (
                  <div key={t.id} className="db-team-status-card" style={isBlocked ? { borderColor: '#ef444444', background: '#1a0a0a' } : {}}>
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
              <div style={{ clipPath: `inset(0 ${chartClipRight}% 0 0)` }}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={fullChartData}
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
                        isAnimationActive={false}
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
                        isAnimationActive={false}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
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
              <span>자동 차단 <strong style={{ color: '#f87171' }}>{blockedCount}건</strong></span>
              <span className="db-alert-sep">·</span>
              <span>예산 초과 팀 <strong style={{ color: '#fb923c' }}>{liveMeta.filter(m => m.pct >= 100).length}팀</strong></span>
              <span className="db-alert-sep">·</span>
              <span>전체 예산 <strong style={{ color: '#4ade80' }}>${(overview?.company_budget ?? 1330)}</strong></span>
              <span className="db-alert-sep">·</span>
              <span>총 소비 <strong style={{ color: blockedCount > 0 ? '#f87171' : '#fb923c' }}>
                ${liveMeta.reduce((s, m) => s + parseFloat(m.spent.replace(/[$,]/g, '')), 0).toFixed(0)}
              </strong></span>
            </div>
          </div>

          {/* ── 팀 모델 사용량 & 한도 설정 ── */}
          <div className="db-card">
            <div className="db-card-head">
              <div>
                <p className="db-card-eyebrow">일일 예산 한도 · 팀 클릭 시 허용 모델 설정</p>
                <p className="db-card-title">팀 모델 사용량 & 한도 설정</p>
              </div>
            </div>

            <div className="db-team-model-list">
              {MOCK_TEAMS.map(t => {
                const usage      = TEAM_MODEL_USAGE.find(u => u.id === t.id);
                const isEditing  = editingId === t.id;
                const limit      = limits[t.id];
                const isExpanded = expandedTeam === t.id;
                const allowed    = allowedModels[t.id] ?? new Set();

                return (
                  <div key={t.id} className="db-team-model-row">
                    {/* 팀 헤더 행 */}
                    <div
                      className="db-team-model-header"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedTeam(isExpanded ? null : t.id)}
                    >
                      <span className="db-legend-dot" style={{ background: t.color }} />
                      <span className="db-team-model-name" style={{ color: t.color }}>{t.name}</span>
                      {isEditing ? (
                        <div className="db-limit-ctrl" onClick={e => e.stopPropagation()}>
                          <span style={{ fontSize: 11, color: '#475569' }}>$</span>
                          <input
                            className="db-limit-input"
                            type="number"
                            value={draftLimit}
                            onChange={e => setDraftLimit(e.target.value)}
                            autoFocus
                          />
                          <span style={{ fontSize: 11, color: '#475569' }}>/일</span>
                          <button className="db-limit-btn db-limit-btn--save" onClick={() => {
                            setLimits(prev => ({ ...prev, [t.id]: +draftLimit || prev[t.id] }));
                            setEditingId(null);
                          }}>저장</button>
                        </div>
                      ) : (
                        <div className="db-limit-ctrl" onClick={e => e.stopPropagation()}>
                          <span className="db-limit-value">
                            ${limit}<span style={{ fontSize: 10, color: '#475569' }}>/일</span>
                          </span>
                          <button className="db-limit-btn" onClick={() => {
                            setEditingId(t.id); setDraftLimit(String(limit));
                          }}>편집</button>
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: '#334155', marginLeft: 6 }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>

                    {/* 모델 사용 비율 바 */}
                    <div className="db-model-bar-wrap">
                      {usage.models.map(m => (
                        <div key={m.name} className="db-model-bar-seg"
                          style={{ width: `${m.pct * simProgress}%`, background: m.color }}
                          title={`${m.name}: ${Math.round(m.pct * simProgress)}%`} />
                      ))}
                    </div>
                    <div className="db-model-labels">
                      {usage.models.map(m => (
                        <span key={m.name} className="db-model-label" style={{ color: m.color }}>
                          ■ {m.name} {Math.round(m.pct * simProgress)}%
                        </span>
                      ))}
                    </div>

                    {/* 허용 모델 설정 (펼침) */}
                    {isExpanded && (
                      <div style={{ marginTop: 10, padding: '12px', background: '#07070f', borderRadius: 8, border: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>사용 허용 모델</p>
                        {ALL_MODEL_TYPES.map(provider => (
                          <div key={provider.id}>
                            {/* 제공사 헤더 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: 4, background: provider.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 7, fontWeight: 800, color: '#fff', flexShrink: 0,
                              }}>{provider.logo}</div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: provider.color }}>{provider.name}</span>
                            </div>
                            {/* 세부 모델 토글 */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 26 }}>
                              {provider.models.map(mo => {
                                const on = allowed.has(mo.id);
                                return (
                                  <button
                                    key={mo.id}
                                    onClick={e => { e.stopPropagation(); toggleModel(t.id, mo.id); }}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 5,
                                      padding: '4px 9px', borderRadius: 5, cursor: 'pointer',
                                      fontSize: 11, fontWeight: 600,
                                      border: `1px solid ${on ? provider.color + '66' : '#1e1e35'}`,
                                      background: on ? provider.color + '15' : '#0d0d1c',
                                      color: on ? '#e2e8f0' : '#334155',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    <span style={{
                                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                      background: on ? TIER_COLOR[mo.tier] + '22' : '#1a1a2e',
                                      color: on ? TIER_COLOR[mo.tier] : '#334155',
                                    }}>{mo.tier}</span>
                                    {mo.label}
                                    <span style={{ fontSize: 10, color: on ? '#4ade80' : '#334155' }}>
                                      {on ? '✓' : '✕'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
              const teamColor  = MOCK_TEAMS.find(t => t.id === selectedTeam)?.color ?? '#60a5fa';
              const p          = simProgress;
              const livePct    = Math.round(m.pct * p);
              const liveCost   = `$${(parseFloat(m.cost.replace('$', '')) * p).toFixed(1)}`;
              const liveClaude = m.claude === '—' ? '—' : `${(parseFloat(m.claude) * p).toFixed(2)}M`;
              const liveGemini = m.gemini === '—' ? '—' : `${(parseFloat(m.gemini) * p).toFixed(2)}M`;
              const liveGpt4o  = m.gpt4o  === '—' ? '—' : `${(parseFloat(m.gpt4o)  * p).toFixed(2)}M`;
              return (
                <div key={m.name} className="db-member-row">
                  <span className="db-emp-name">{m.name}</span>
                  <span style={{ color: '#fbbf24' }}>{liveClaude}</span>
                  <span style={{ color: m.gemini === '—' ? '#334155' : '#34d399' }}>{liveGemini}</span>
                  <span style={{ color: m.gpt4o  === '—' ? '#334155' : '#f472b6' }}>{liveGpt4o}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'Courier New' }}>{liveCost}</span>
                  <span>
                    <div className="db-pct-bar">
                      <div className="db-pct-fill" style={{ width: `${livePct}%`, background: teamColor }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{livePct}%</span>
                  </span>
                </div>
              );
            })}
          </div>
          {(() => {
            const tm = liveMeta.find(m => m.id === selectedTeam);
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

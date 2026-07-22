import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

/* ── 보안 알림 데이터 ── */
const INITIAL_ALERTS = [
  { id: 1, ts: '14:32:11', severity: 'critical', type: 'Rate Limit Burst',       source: '203.0.113.45',  team: '프론트엔드팀', detail: '60초 내 OpenAI API 2,400건 호출 (정상의 8.2배)',    status: 'blocked'       },
  { id: 2, ts: '14:28:03', severity: 'high',     type: 'Credential Stuffing',    source: '198.51.100.22', team: '—',           detail: 'API Key 무효 인증 시도 87회 연속',                  status: 'investigating' },
  { id: 3, ts: '14:15:47', severity: 'medium',   type: 'Off-Hours Large Batch',  source: '박팀원',        team: '프론트엔드팀', detail: '새벽 3:15 배치 실행 · 토큰 4,200개 소비',           status: 'monitoring'    },
  { id: 4, ts: '13:52:29', severity: 'medium',   type: 'Budget Anomaly',         source: 'QA팀',          team: 'QA팀',         detail: '평소 대비 340% 사용량 급증 감지',                   status: 'monitoring'    },
  { id: 5, ts: '13:41:08', severity: 'low',      type: 'New IP Access',          source: '10.20.30.41',   team: '백엔드팀',     detail: '신규 IP 최초 API 접근 시도',                        status: 'resolved'      },
  { id: 6, ts: '13:12:55', severity: 'critical', type: 'Key Exposure Risk',      source: '이영희',        team: '백엔드팀',     detail: 'GitHub 공개 레포에 API Key 패턴 감지 → 즉시 차단',  status: 'blocked'       },
  { id: 7, ts: '12:58:33', severity: 'low',      type: 'Slow Rate Probe',        source: '45.79.11.180',  team: '—',           detail: '분당 1건씩 탐색성 호출 3시간 지속',                 status: 'monitoring'    },
  { id: 8, ts: '12:34:17', severity: 'high',     type: 'Model Downgrade Bypass', source: '데이터팀',      team: '데이터팀',     detail: 'GPT-4o 정책 우회 후 GPT-4o-mini 대량 호출 시도',    status: 'resolved'      },
];

/* ── 시간대별 알림 빈도 ── */
const ALERT_HOURLY = Array.from({ length: 24 }, (_, i) => ({
  name: `${i}시`,
  critical: i === 14 ? 2 : i === 13 ? 1 : 0,
  high:     i === 14 ? 1 : i === 12 ? 1 : i === 8 ? 1 : 0,
  medium:   i === 15 ? 1 : i === 13 ? 1 : i === 3 ? 1 : 0,
  low:      i === 13 ? 1 : i === 12 ? 1 : i === 9 ? 1 : 0,
}));

/* ── 차단 IP 목록 ── */
const INITIAL_BLOCKED = [
  { ip: '203.0.113.45',  reason: 'Rate Limit Burst',     blockedAt: '14:32', expires: '15:32', reqs: 2400 },
  { ip: '198.51.100.22', reason: 'Credential Stuffing',  blockedAt: '14:28', expires: '영구',  reqs: 87   },
  { ip: '45.79.11.180',  reason: 'Slow Rate Probe',      blockedAt: '13:00', expires: '15:00', reqs: 190  },
];

/* ── 토큰 이상 감지 ── */
const TOKEN_ANOMALIES = [
  { subject: '이영희',   team: '백엔드팀',  baseline: 8200,  actual: 27800, delta: '+238%', risk: 'critical' },
  { subject: 'QA팀',     team: 'QA팀',      baseline: 5300,  actual: 18000, delta: '+240%', risk: 'high'     },
  { subject: '데이터팀', team: '데이터팀',  baseline: 31000, actual: 45600, delta: '+47%',  risk: 'medium'   },
  { subject: '박팀원',   team: '프론트엔드팀', baseline: 2800, actual: 4200, delta: '+50%', risk: 'medium'   },
];

const SEV_META = {
  critical: { label: 'CRITICAL', bg: '#fce8e6', color: '#ea4335', dot: '#ea4335' },
  high:     { label: 'HIGH',     bg: '#fef3c7', color: '#b45309', dot: '#f59e0b' },
  medium:   { label: 'MEDIUM',   bg: '#fff8e1', color: '#6d4c00', dot: '#f9ab00' },
  low:      { label: 'LOW',      bg: '#e6f4ea', color: '#1e6e3c', dot: '#34a853' },
};

const STATUS_META = {
  blocked:       { label: '차단됨',    bg: '#fce8e6', color: '#ea4335' },
  investigating: { label: '조사 중',   bg: '#fef3c7', color: '#b45309' },
  monitoring:    { label: '모니터링',  bg: '#e8f0fe', color: '#1a73e8' },
  resolved:      { label: '해결됨',    bg: '#e6f4ea', color: '#34a853' },
};

export default function SecurityPage() {
  const [alerts, setAlerts]         = useState(INITIAL_ALERTS);
  const [blocked, setBlocked]       = useState(INITIAL_BLOCKED);
  const [sevFilter, setSevFilter]   = useState('all');
  const [liveMode, setLiveMode]     = useState(false);
  const [lastPing, setLastPing]     = useState(null);
  const intervalRef = useRef(null);

  /* 실시간 시뮬레이션 */
  useEffect(() => {
    if (!liveMode) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      const sevs = ['low', 'medium', 'high', 'critical'];
      const types = ['Rate Spike', 'Auth Failure', 'Token Anomaly', 'Geo Anomaly', 'Slow Probe'];
      const sources = ['192.0.2.' + Math.floor(Math.random() * 254), '홍길동', '외부 IP', '김수진'];
      const sev = sevs[Math.floor(Math.random() * (Math.random() < 0.15 ? 4 : 2))];
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newAlert = {
        id: Date.now(),
        ts,
        severity: sev,
        type: types[Math.floor(Math.random() * types.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        team: ['프론트엔드팀', '백엔드팀', '데이터팀', '—'][Math.floor(Math.random() * 4)],
        detail: `실시간 감지 이벤트 — ${sev.toUpperCase()} 레벨`,
        status: sev === 'critical' ? 'blocked' : 'monitoring',
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 30));
      setLastPing(ts);
    }, 2500);
    return () => clearInterval(intervalRef.current);
  }, [liveMode]);

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const high     = alerts.filter((a) => a.severity === 'high').length;
  const medium   = alerts.filter((a) => a.severity === 'medium').length;
  const low      = alerts.filter((a) => a.severity === 'low').length;

  const filtered = sevFilter === 'all' ? alerts : alerts.filter((a) => a.severity === sevFilter);

  const unblockIP = (ip) => setBlocked((prev) => prev.filter((b) => b.ip !== ip));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">보안 모니터링</h1>
          <p className="page-sub">API 해킹 감지 · 이상 토큰 사용 · 차단 현황을 실시간으로 모니터링합니다</p>
        </div>
        <button
          className={`sim-btn ${liveMode ? 'sim-btn--stop' : ''}`}
          onClick={() => setLiveMode((p) => !p)}
        >
          {liveMode ? '⏹ 실시간 중지' : '⚡ 실시간 감지 시작'}
        </button>
      </div>

      {liveMode && (
        <div className="sec-live-banner">
          <span className="sec-live-dot" />
          실시간 모니터링 중 {lastPing && <span style={{ opacity: 0.7 }}>— 마지막 이벤트 {lastPing}</span>}
        </div>
      )}

      {/* 스탯 */}
      <div className="stat-row">
        <div className="stat-card"><span className="stat-value red">{critical}</span><span className="stat-label">CRITICAL 알림</span></div>
        <div className="stat-card"><span className="stat-value orange">{high}</span><span className="stat-label">HIGH 알림</span></div>
        <div className="stat-card"><span className="stat-value" style={{ color: '#b45309' }}>{medium}</span><span className="stat-label">MEDIUM 알림</span></div>
        <div className="stat-card"><span className="stat-value green">{low}</span><span className="stat-label">LOW 알림</span></div>
        <div className="stat-card"><span className="stat-value red">{blocked.length}</span><span className="stat-label">차단된 IP</span></div>
        <div className="stat-card"><span className="stat-value orange">{TOKEN_ANOMALIES.length}</span><span className="stat-label">토큰 이상 감지</span></div>
      </div>

      {/* 시간대별 알림 빈도 */}
      <div className="analytics-card">
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">오늘 시간대별 보안 이벤트</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ALERT_HOURLY} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barSize={8} barGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#80868b' }} interval={2} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#80868b' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e0e0e0', fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} iconType="circle" iconSize={8} />
            <Bar dataKey="critical" stackId="a" fill="#ea4335" name="Critical" radius={[0, 0, 0, 0]} />
            <Bar dataKey="high"     stackId="a" fill="#f59e0b" name="High"     radius={[0, 0, 0, 0]} />
            <Bar dataKey="medium"   stackId="a" fill="#f9ab00" name="Medium"   radius={[0, 0, 0, 0]} />
            <Bar dataKey="low"      stackId="a" fill="#34a853" name="Low"      radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 알림 피드 */}
      <div className="analytics-card" style={{ marginTop: 20 }}>
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">보안 알림 피드</h2>
          <div className="filter-tabs" style={{ margin: 0 }}>
            {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
              <button
                key={s}
                className={`filter-tab ${sevFilter === s ? 'filter-tab--active' : ''}`}
                onClick={() => setSevFilter(s)}
              >
                {s === 'all' ? '전체' : s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="sec-alert-list">
          {filtered.map((a) => {
            const sm = SEV_META[a.severity];
            const stm = STATUS_META[a.status];
            return (
              <div key={a.id} className={`sec-alert-row ${a.severity === 'critical' ? 'sec-alert-row--critical' : ''}`}>
                <span className="sec-alert-dot" style={{ background: sm.dot }} />
                <span className="sec-alert-time">{a.ts}</span>
                <span className="sec-sev-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                <div className="sec-alert-body">
                  <span className="sec-alert-type">{a.type}</span>
                  <span className="sec-alert-detail">{a.detail}</span>
                </div>
                <span className="sec-alert-source">
                  <span className="user-avatar" style={{ fontSize: 10 }}>{a.source[0]}</span>
                  {a.source}
                </span>
                <span className="sec-status-badge" style={{ background: stm.bg, color: stm.color }}>{stm.label}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: '#80868b', padding: '32px 0', fontSize: 14 }}>해당 심각도의 알림이 없습니다</p>
          )}
        </div>
      </div>

      {/* 차단 IP 목록 */}
      <div className="analytics-card" style={{ marginTop: 20 }}>
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">차단된 IP 목록</h2>
        </div>
        <div className="sec-ip-table">
          <div className="sec-ip-header">
            <span>IP 주소</span><span>차단 사유</span><span>차단 시각</span><span>해제 예정</span><span>총 요청</span><span>액션</span>
          </div>
          {blocked.map((b) => (
            <div key={b.ip} className="sec-ip-row">
              <span className="sec-ip-addr">{b.ip}</span>
              <span style={{ fontSize: 13, color: '#5f6368' }}>{b.reason}</span>
              <span style={{ fontSize: 13 }}>{b.blockedAt}</span>
              <span style={{ fontSize: 13, color: b.expires === '영구' ? '#ea4335' : '#5f6368', fontWeight: b.expires === '영구' ? 700 : 400 }}>{b.expires}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{b.reqs.toLocaleString()}건</span>
              <button className="sec-unblock-btn" onClick={() => unblockIP(b.ip)}>차단 해제</button>
            </div>
          ))}
          {blocked.length === 0 && (
            <p style={{ textAlign: 'center', color: '#80868b', padding: '24px 0', fontSize: 14 }}>차단된 IP가 없습니다</p>
          )}
        </div>
      </div>

      {/* 토큰 이상 사용 감지 */}
      <div className="analytics-card" style={{ marginTop: 20 }}>
        <div className="analytics-card-header">
          <h2 className="analytics-card-title">토큰 이상 사용 감지</h2>
          <span style={{ fontSize: 13, color: '#5f6368' }}>기준: 개인/팀 30일 평균 대비 ±30% 이상 편차</span>
        </div>
        <div className="sec-anomaly-table">
          <div className="sec-anomaly-header">
            <span>대상</span><span>팀</span><span>30일 평균 (건)</span><span>현재 사용량 (건)</span><span>변화율</span><span>위험도</span>
          </div>
          {TOKEN_ANOMALIES.map((a) => {
            const rm = SEV_META[a.risk];
            return (
              <div key={a.subject} className="sec-anomaly-row">
                <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="user-avatar">{a.subject[0]}</span>{a.subject}
                </span>
                <span style={{ fontSize: 13, color: '#5f6368' }}>{a.team}</span>
                <span style={{ fontSize: 13 }}>{a.baseline.toLocaleString()}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{a.actual.toLocaleString()}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: rm.color }}>{a.delta}</span>
                <span className="sec-sev-badge" style={{ background: rm.bg, color: rm.color }}>{rm.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import api from '../api/index.js';

/* ── 시간대별 알림 빈도 (로컬 집계) ── */
function buildHourly(alerts) {
  const buckets = Array.from({ length: 24 }, (_, i) => ({
    name: `${i}시`, critical: 0, high: 0, medium: 0, low: 0,
  }));
  alerts.forEach((a) => {
    const dateStr = a.created_at ?? '';
    const hourMatch = dateStr.match(/T(\d{2}):/);
    const hour = hourMatch ? parseInt(hourMatch[1], 10) : null;
    if (hour !== null && buckets[hour]) {
      const sev = a.severity === 'critical' ? 'critical' : a.severity;
      if (buckets[hour][sev] !== undefined) buckets[hour][sev]++;
    }
  });
  return buckets;
}

/* ── 차단 IP 목록 (mock — no backend endpoint) ── */
const INITIAL_BLOCKED = [
  { ip: '203.0.113.45',  reason: 'Rate Limit Burst',     blockedAt: '14:32', expires: '15:32', reqs: 2400 },
  { ip: '198.51.100.22', reason: 'Credential Stuffing',  blockedAt: '14:28', expires: '영구',  reqs: 87   },
  { ip: '45.79.11.180',  reason: 'Slow Rate Probe',      blockedAt: '13:00', expires: '15:00', reqs: 190  },
];

/* ── 토큰 이상 감지 (mock — no backend endpoint) ── */
const TOKEN_ANOMALIES = [
  { subject: '이영희',   team: '백엔드팀',     baseline: 8200,  actual: 27800, delta: '+238%', risk: 'critical' },
  { subject: 'QA팀',     team: 'QA팀',         baseline: 5300,  actual: 18000, delta: '+240%', risk: 'high'     },
  { subject: '데이터팀', team: '데이터팀',     baseline: 31000, actual: 45600, delta: '+47%',  risk: 'medium'   },
  { subject: '박팀원',   team: '프론트엔드팀', baseline: 2800,  actual: 4200,  delta: '+50%',  risk: 'medium'   },
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
  unread:        { label: '읽지 않음', bg: '#e8f0fe', color: '#1a73e8' },
  read:          { label: '읽음',      bg: '#f1f3f4', color: '#5f6368' },
};

// Normalize backend alert to UI shape
function normalizeAlert(a) {
  return {
    id:       a.id,
    ts:       a.created_at ? new Date(a.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—',
    severity: a.severity === 'critical' ? 'critical' : (a.severity ?? 'low'),
    type:     a.type ?? 'Alert',
    source:   a.provider_name ?? a.team ?? '—',
    team:     a.team ?? '—',
    detail:   a.message ?? '',
    status:   a.read ? 'read' : 'unread',
    read:     a.read ?? false,
  };
}

export default function SecurityPage() {
  const [alerts, setAlerts]         = useState([]);
  const [blocked, setBlocked]       = useState(INITIAL_BLOCKED);
  const [sevFilter, setSevFilter]   = useState('all');
  const [sseActive, setSseActive]   = useState(false);
  const [lastPing, setLastPing]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const sseAbortRef = useRef(null);

  /* ── 초기 로드 ── */
  useEffect(() => {
    api.get('/alerts/', { params: { status: 'all', limit: 50 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setAlerts(list.map(normalizeAlert));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── SSE 연결 ── */
  const startSSE = () => {
    setSseActive(true);
    const token = localStorage.getItem('access_token');
    const controller = new AbortController();
    sseAbortRef.current = controller;

    fetch('/api/alerts/stream/', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then((res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = () => {
        reader.read().then(({ done, value }) => {
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          parts.forEach((chunk) => {
            const line = chunk.trim();
            if (line.startsWith('data:')) {
              try {
                const payload = JSON.parse(line.slice(5).trim());
                const normalized = normalizeAlert(payload);
                setAlerts((prev) => [normalized, ...prev].slice(0, 50));
                setLastPing(normalized.ts);
              } catch {
                // ignore malformed events
              }
            }
          });
          read();
        }).catch(() => {});
      };
      read();
    }).catch(() => {});
  };

  const stopSSE = () => {
    sseAbortRef.current?.abort();
    setSseActive(false);
  };

  useEffect(() => {
    return () => sseAbortRef.current?.abort();
  }, []);

  /* ── Mark as read ── */
  const markRead = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/read/`);
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, read: true, status: 'read' } : a));
    } catch {
      // ignore
    }
  };

  const hourlyData = buildHourly(alerts);

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
          className={`sim-btn ${sseActive ? 'sim-btn--stop' : ''}`}
          onClick={() => sseActive ? stopSSE() : startSSE()}
        >
          {sseActive ? '⏹ 실시간 중지' : '⚡ 실시간 감지 시작'}
        </button>
      </div>

      {sseActive && (
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
          <BarChart data={hourlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barSize={8} barGap={1}>
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

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#5f6368', fontSize: 14 }}>알림 로딩 중...</div>
        ) : (
          <div className="sec-alert-list">
            {filtered.map((a) => {
              const sm  = SEV_META[a.severity]  ?? SEV_META.low;
              const stm = STATUS_META[a.status] ?? STATUS_META.monitoring;
              return (
                <div
                  key={a.id}
                  className={`sec-alert-row ${a.severity === 'critical' ? 'sec-alert-row--critical' : ''}`}
                  style={{ opacity: a.read ? 0.7 : 1 }}
                  onClick={() => !a.read && markRead(a.id)}
                >
                  <span className="sec-alert-dot" style={{ background: sm.dot }} />
                  <span className="sec-alert-time">{a.ts}</span>
                  <span className="sec-sev-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                  <div className="sec-alert-body">
                    <span className="sec-alert-type">{a.type}</span>
                    <span className="sec-alert-detail">{a.detail}</span>
                  </div>
                  <span className="sec-alert-source">
                    <span className="user-avatar" style={{ fontSize: 10 }}>{(a.source ?? '?')[0]}</span>
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
        )}
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

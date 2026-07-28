import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ComposedChart, AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Cell,
} from 'recharts';
import { ComposableMap, Geographies, Geography, Graticule, useMapContext } from 'react-simple-maps';
import api from '../api/index.js';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/* ── Mock data ── */
// normal: 평상시 API 요청 수, attack: 공격 트래픽(14시부터 수직 폭등)
const HOURLY_THREATS = [
  { time: '00:00', normal: 185,  attack: 0      },
  { time: '01:00', normal: 142,  attack: 0      },
  { time: '02:00', normal: 118,  attack: 0      },
  { time: '03:00', normal: 107,  attack: 0      },
  { time: '04:00', normal: 128,  attack: 0      },
  { time: '05:00', normal: 163,  attack: 0      },
  { time: '06:00', normal: 224,  attack: 0      },
  { time: '07:00', normal: 385,  attack: 0      },
  { time: '08:00', normal: 462,  attack: 0      },
  { time: '09:00', normal: 491,  attack: 0      },
  { time: '10:00', normal: 518,  attack: 0      },
  { time: '11:00', normal: 487,  attack: 0      },
  { time: '12:00', normal: 512,  attack: 0      },
  { time: '13:00', normal: 476,  attack: 0      },
  { time: '14:00', normal: 498,  attack: 3200   }, // 마스터 키 노출 → 공격 시작
  { time: '15:00', normal: 500,  attack: 52400  }, // 에이전트 순환 호출 폭발
  { time: '16:00', normal: 500,  attack: 186000 }, // 피크 — 수직 폭등
  { time: '17:00', normal: 487,  attack: 14200  }, // FinOps Guard 차단 → 급감
  { time: '18:00', normal: 468,  attack: 620    },
  { time: '19:00', normal: 445,  attack: 0      },
  { time: '20:00', normal: 421,  attack: 0      },
  { time: '21:00', normal: 398,  attack: 0      },
  { time: '22:00', normal: 312,  attack: 0      },
  { time: '23:00', normal: 248,  attack: 0      },
];

// LOG_POOL·INCIDENT_LOG_POOL에 등장하는 모든 국가의 좌표·색상
const COUNTRY_META = {
  '중국':       { lat: 35,   lon: 105,   color: '#f87171' },
  '러시아':     { lat: 61,   lon: 80,    color: '#fb923c' },
  '북한':       { lat: 40,   lon: 127.5, color: '#f9ab00' },
  '미국':       { lat: 38,   lon: -97,   color: '#60a5fa' },
  '브라질':     { lat: -14,  lon: -51,   color: '#a78bfa' },
  '베트남':     { lat: 16,   lon: 108,   color: '#34d399' },
  '루마니아':   { lat: 46,   lon: 25,    color: '#f472b6' },
  '네덜란드':   { lat: 52,   lon: 5,     color: '#818cf8' },
  '독일':       { lat: 51,   lon: 10,    color: '#fbbf24' },
  '인도네시아': { lat: -5,   lon: 120,   color: '#2dd4bf' },
  '싱가포르':   { lat: 1,    lon: 104,   color: '#e879f9' },
  '라트비아':   { lat: 57,   lon: 25,    color: '#94a3b8' },
  '호주':       { lat: -25,  lon: 133,   color: '#4ade80' },
  '프랑스':     { lat: 46,   lon: 2,     color: '#c084fc' },
  '영국':       { lat: 54,   lon: -2,    color: '#7dd3fc' },
};

const LOG_POOL = [
  { ip: '103.56.14.228',   flag: '🇨🇳', country: '중국',       type: '크리덴셜 스터핑',      endpoint: 'POST /api/auth/login',     status: 'blocked',    severity: 'high'     },
  { ip: '45.142.212.100',  flag: '🇷🇺', country: '러시아',     type: 'API 키 무차별 대입',   endpoint: 'GET  /api/v1/keys',        status: 'blocked',    severity: 'critical' },
  { ip: '171.244.51.36',   flag: '🇻🇳', country: '베트남',     type: '결제 API 탐색',        endpoint: 'POST /api/payments',       status: 'active',     severity: 'medium'   },
  { ip: '52.87.152.44',    flag: '🇺🇸', country: '미국',       type: '대규모 웹 스크래핑',   endpoint: 'GET  /api/products',       status: 'monitoring', severity: 'low'      },
  { ip: '89.248.167.131',  flag: '🇷🇴', country: '루마니아',   type: 'SQL 인젝션 시도',      endpoint: 'GET  /api/search',         status: 'blocked',    severity: 'critical' },
  { ip: '177.67.85.12',    flag: '🇧🇷', country: '브라질',     type: '계정 탈취 (ATO)',      endpoint: 'POST /api/auth/session',   status: 'monitoring', severity: 'high'     },
  { ip: '185.220.101.47',  flag: '🇳🇱', country: '네덜란드',   type: 'OAuth 토큰 위조',      endpoint: 'POST /oauth/token',        status: 'monitoring', severity: 'token'    },
  { ip: '175.45.176.0',    flag: '🇰🇵', country: '북한',       type: 'APT 금융 시스템 공격', endpoint: 'POST /api/transfers',      status: 'blocked',    severity: 'critical' },
  { ip: '91.109.4.244',    flag: '🇩🇪', country: '독일',       type: '취약점 자동 스캔',     endpoint: 'GET  /api/admin',          status: 'blocked',    severity: 'medium'   },
  { ip: '118.25.6.39',     flag: '🇨🇳', country: '중국',       type: '비정상 크롤링',        endpoint: 'GET  /api/v2/data',        status: 'monitoring', severity: 'medium'   },
  { ip: '5.188.86.172',    flag: '🇷🇺', country: '러시아',     type: '포트 스캔',            endpoint: 'GET  /api/health',         status: 'monitoring', severity: 'medium'   },
  { ip: '114.119.136.45',  flag: '🇮🇩', country: '인도네시아', type: '레이트 리밋 우회',     endpoint: 'GET  /api/v2/export',      status: 'active',     severity: 'low'      },
  { ip: '162.247.74.74',   flag: '🇺🇸', country: '미국',       type: 'Tor 경유 봇',          endpoint: 'GET  /api/users/list',     status: 'monitoring', severity: 'medium'   },
  { ip: '103.21.244.0',    flag: '🇸🇬', country: '싱가포르',   type: '세션 하이재킹',        endpoint: 'GET  /api/auth/verify',    status: 'blocked',    severity: 'high'     },
  { ip: '210.52.109.22',   flag: '🇰🇵', country: '북한',       type: '암호화폐 지갑 탈취',   endpoint: 'GET  /api/wallet/export',  status: 'blocked',    severity: 'critical' },
  { ip: '116.203.55.131',  flag: '🇩🇪', country: '독일',       type: 'XSS 페이로드',         endpoint: 'POST /api/feedback',       status: 'blocked',    severity: 'high'     },
  { ip: '194.165.16.101',  flag: '🇱🇻', country: '라트비아',   type: '관리자 패널 접근',     endpoint: 'GET  /admin/dashboard',    status: 'blocked',    severity: 'critical' },
  { ip: '43.153.79.22',    flag: '🇨🇳', country: '중국',       type: '토큰 재사용',          endpoint: 'POST /api/auth/refresh',   status: 'active',     severity: 'token'    },
  { ip: '192.42.116.16',   flag: '🇳🇱', country: '네덜란드',   type: '디렉토리 트래버설',    endpoint: 'GET  /api/../config',      status: 'blocked',    severity: 'high'     },
];

const INCIDENT_LOG_POOL = [
  { ip: '34.102.136.180',  flag: '🇺🇸', country: '미국 (GCP)',        type: '마스터 키 재사용',        endpoint: 'POST /api/agents/spawn',          status: 'active',  severity: 'critical' },
  { ip: '52.14.229.105',   flag: '🇺🇸', country: '미국 (AWS)',        type: '에이전트 자가 복제',      endpoint: 'POST /api/agents/3829/invoke',    status: 'active',  severity: 'critical' },
  { ip: '13.228.161.144',  flag: '🇸🇬', country: '싱가포르 (AWS)',    type: '에이전트↔에이전트 호출',  endpoint: 'POST /api/agents/7291/invoke',    status: 'active',  severity: 'critical' },
  { ip: '35.197.91.250',   flag: '🇦🇺', country: '호주 (GCP)',        type: '순환 요청 루프',          endpoint: 'POST /api/agents/1847/invoke',    status: 'active',  severity: 'critical' },
  { ip: '104.155.25.47',   flag: '🇫🇷', country: '프랑스 (GCP)',      type: '비정상 토큰 체이닝',      endpoint: 'POST /api/v1/completions',        status: 'active',  severity: 'token'    },
  { ip: '20.54.23.162',    flag: '🇳🇱', country: '네덜란드 (Azure)',   type: '대량 에이전트 스폰',      endpoint: 'POST /api/agents/batch/spawn',    status: 'active',  severity: 'critical' },
  { ip: '40.76.4.15',      flag: '🇺🇸', country: '미국 (Azure)',      type: '가짜 에이전트 네트워크',  endpoint: 'POST /api/agents/2394/invoke',    status: 'active',  severity: 'high'     },
  { ip: '34.87.18.21',     flag: '🇸🇬', country: '싱가포르 (GCP)',    type: '권한 에스컬레이션',       endpoint: 'POST /api/admin/agents',          status: 'blocked', severity: 'critical' },
  { ip: '18.141.129.246',  flag: '🇸🇬', country: '싱가포르 (AWS)',    type: '에이전트 명령 주입',      endpoint: 'POST /api/agents/5821/invoke',    status: 'blocked', severity: 'high'     },
  { ip: '34.105.33.103',   flag: '🇬🇧', country: '영국 (GCP)',        type: '비용 무제한 루프',        endpoint: 'POST /api/agents/9143/invoke',    status: 'active',  severity: 'token'    },
  { ip: '34.64.77.21',    flag: '🇺🇸', country: '미국 (GCP)',        type: '에이전트 응답 이상',      endpoint: 'GET  /api/agents/status',         status: 'monitoring', severity: 'medium' },
  { ip: '52.78.12.34',    flag: '🇺🇸', country: '미국 (AWS)',        type: 'API 요청 패턴 이상',      endpoint: 'GET  /api/v1/agents/list',        status: 'monitoring', severity: 'medium' },
];

function toRad(d) { return d * Math.PI / 180; }

/* ── Attack map (react-simple-maps) ── */
const SEOUL = [127, 37.5]; // [lon, lat]

function AttackOverlay({ sources }) {
  const { projection } = useMapContext();
  if (!projection) return null;
  const [tx, ty] = projection(SEOUL);

  return (
    <g>
      {sources.map((atk, idx) => {
        const [sx, sy] = projection([atk.lon, atk.lat]);
        const dist = Math.hypot(tx - sx, ty - sy);
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2 - dist * 0.45;
        const arcId = `atk-arc-${idx}`;
        const d = `M ${sx},${sy} Q ${mx},${my} ${tx},${ty}`;
        const dur = `${1.6 + (idx % 6) * 0.28}s`;
        return (
          <g key={atk.country}>
            <path d={d} fill="none" stroke={atk.color} strokeWidth={5} strokeOpacity={0.1} />
            <path id={arcId} d={d} fill="none" stroke={atk.color} strokeWidth={1.2} strokeOpacity={0.6} />
            <circle r={6} fill={atk.color} fillOpacity={0.25}>
              <animateMotion dur={dur} repeatCount="indefinite"><mpath href={`#${arcId}`} /></animateMotion>
            </circle>
            <circle r={2.5} fill="#fff">
              <animateMotion dur={dur} repeatCount="indefinite"><mpath href={`#${arcId}`} /></animateMotion>
            </circle>
            <circle cx={sx} cy={sy} r={3} fill={atk.color} fillOpacity={0.95} />
            <circle cx={sx} cy={sy} r={3} fill="none" stroke={atk.color}>
              <animate attributeName="r" values="3;11" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.6;0" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <text
              x={sx} y={sy - 11}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
              fill={atk.color}
              style={{ filter: 'drop-shadow(0 0 5px #000) drop-shadow(0 0 5px #000)' }}
            >{atk.country}</text>
          </g>
        );
      })}
      <circle cx={tx} cy={ty} r={4} fill="#4ade80" />
      <circle cx={tx} cy={ty} r={4} fill="none" stroke="#4ade80" strokeWidth={1.5}>
        <animate attributeName="r" values="4;18" dur="2s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={tx} cy={ty} r={4} fill="none" stroke="#4ade80" strokeWidth={1}>
        <animate attributeName="r" values="4;28" dur="2s" begin="0.7s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.4;0" dur="2s" begin="0.7s" repeatCount="indefinite" />
      </circle>
      <text x={tx} y={ty + 13} textAnchor="middle" fontSize={8} fill="#4ade80" fontWeight={700}
        fontFamily="system-ui, sans-serif">서울</text>
    </g>
  );
}

function AttackMap({ attackSources }) {
  return (
    <div style={{ width: '100%', background: '#060d1b', borderRadius: 8, overflow: 'hidden', aspectRatio: '800 / 470' }}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 155, center: [10, 10] }}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <rect width={800} height={600} fill="#060d1b" />
        <Graticule stroke="#0c1c33" strokeWidth={0.5} />
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#0d1d30"
                stroke="#1a3254"
                strokeWidth={0.5}
                style={{ outline: 'none', default: { outline: 'none' }, hover: { outline: 'none' }, pressed: { outline: 'none' } }}
              />
            ))
          }
        </Geographies>
        <AttackOverlay sources={attackSources} />
      </ComposableMap>
    </div>
  );
}

/* ── Crisis gauge ── */
function CrisisGauge({ level }) {
  const LEVELS = [
    { label: '정상', color: '#4ade80' },
    { label: '관심', color: '#60a5fa' },
    { label: '주의', color: '#f9ab00' },
    { label: '경계', color: '#fb923c' },
    { label: '심각', color: '#f87171' },
  ];
  const W = 260, H = 150;
  const cx = W / 2, cy = H - 18;
  const RO = 98, RI = 60, RT = 116;

  function arc(sd, ed) {
    const s = toRad(sd), e = toRad(ed);
    const x1=cx+RO*Math.cos(s), y1=cy+RO*Math.sin(s);
    const x2=cx+RO*Math.cos(e), y2=cy+RO*Math.sin(e);
    const x3=cx+RI*Math.cos(e), y3=cy+RI*Math.sin(e);
    const x4=cx+RI*Math.cos(s), y4=cy+RI*Math.sin(s);
    return `M${x1} ${y1} A${RO} ${RO} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${RI} ${RI} 0 0 0 ${x4} ${y4}Z`;
  }

  const needleRad = toRad(-180 + (level / 4) * 180);
  const nx = cx + 80 * Math.cos(needleRad);
  const ny = cy + 80 * Math.sin(needleRad);
  const cur = LEVELS[level];

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 8 }}>
      <svg width={W} height={H} style={{ overflow:'visible' }}>
        {LEVELS.map((l, i) => (
          <path key={i}
            d={arc(-180 + i*36 + 1.5, -180 + (i+1)*36 - 1.5)}
            fill={l.color}
            opacity={i === level ? 1 : 0.18}
          />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={7} fill="#0d0d1c" stroke="white" strokeWidth={2}/>
        {LEVELS.map((l, i) => {
          const midRad = toRad(-180 + (i + 0.5) * 36);
          return (
            <text key={i}
              x={cx + RT * Math.cos(midRad)}
              y={cy + RT * Math.sin(midRad)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill={i === level ? l.color : '#334155'}
              fontWeight={i === level ? 700 : 400}
            >{l.label}</text>
          );
        })}
      </svg>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:20, fontWeight:700, color: cur.color }}>{cur.label}</div>
        <div style={{ fontSize:11, color:'#475569', marginTop:2 }}>현재 사이버 위기 단계</div>
      </div>
    </div>
  );
}

/* ── Live threat log feed ── */
let _logId = 0;
function makeEntry(offsetMs = 0, pool = LOG_POOL) {
  const base = pool[Math.floor(Math.random() * pool.length)];
  return { ...base, id: _logId++, time: new Date(Date.now() - offsetMs) };
}

function ThreatLogFeed({ logs, dotOn }) {
  const fmt = (d) =>
    d.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="analytics-card" style={{ display:'flex', flexDirection:'column' }}>
      <div className="analytics-card-header" style={{ marginBottom:8 }}>
        <h2 className="analytics-card-title">탐지된 위협 IP</h2>
        <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
          <span style={{
            width:6, height:6, borderRadius:'50%', flexShrink:0, display:'block',
            background: dotOn ? '#f87171' : 'transparent', transition:'background 0.3s',
          }}/>
          실시간
        </span>
      </div>

      <div style={{ overflowY:'auto', maxHeight:360, fontFamily:'monospace', fontSize:11 }}>
        {logs.length === 0 && (
          <div style={{ color:'#1e3a5f', textAlign:'center', padding:'32px 0', fontSize:12 }}>
            위협 탐지 대기 중...
          </div>
        )}
        {logs.map((log, i) => {
          const sv = SEVERITY_STYLE[log.severity] ?? SEVERITY_STYLE.low;
          const sm = STATUS_STYLE[log.status];
          return (
            <div key={log.id} style={{
              padding:'6px 4px',
              borderBottom:'1px solid #07070f',
              background: i === 0 ? '#0b1b2e' : 'transparent',
              transition: 'background 1.5s',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                <span style={{ color:'#1e3a5f' }}>{fmt(log.time)}</span>
                <div style={{ display:'flex', gap:4 }}>
                  <span style={{ padding:'1px 7px', borderRadius:4, fontSize:9, fontWeight:700, background:sv.bg, color:sv.color }}>
                    {sv.label}
                  </span>
                  <span style={{ padding:'1px 7px', borderRadius:4, fontSize:9, fontWeight:700, background:sm.bg, color:sm.color }}>
                    {sm.label}
                  </span>
                </div>
              </div>
              <div style={{ color:'#3b82f6', marginBottom:2 }}>
                {log.flag} {log.ip} <span style={{ color:'#1e3a5f' }}>({log.country})</span>
              </div>
              <div style={{ color:'#64748b', marginBottom:2 }}>{log.type}</div>
              <div style={{ color:'#475569', fontSize:10 }}>{log.endpoint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Incident Panel ── */
const INCIDENT_EVENTS = [
  { phase: 1, time: '14:23', color: '#f9ab00',
    msg: '공개 GitHub 레포에서 전체 권한 마스터 API 키 노출 감지' },
  { phase: 1, time: '14:24', color: '#fb923c',
    msg: '비정상 에이전트 스폰 폭증 · 해커가 마스터 키로 가짜 에이전트 대량 생성 중' },
  { phase: 2, time: '14:26', color: '#f87171',
    msg: '에이전트↔에이전트 순환 호출 패턴 감지 · 가짜 에이전트끼리 기괴한 요청을 꼬리에 꼬리물고 주고받는 중' },
  { phase: 3, time: '14:31', color: '#f87171',
    msg: 'API 요청량 정상 대비 4,200% 폭증 · 시스템 전체 과부하 · 비용 제어 불가 상태' },
  { phase: 4, time: '14:35', color: '#4ade80',
    msg: 'FinOps Guard 자동 감지 · 마스터 키 즉시 무효화 · 모든 가짜 에이전트 일괄 차단 완료' },
];

function IncidentPanel({ phase, agentCount, apiRate, estimatedCost }) {
  if (phase === 0) return null;
  const isDone = phase >= 4;
  const visibleEvents = INCIDENT_EVENTS.filter(e => e.phase <= phase);

  return (
    <div style={{
      background: isDone ? '#0a120a' : '#120a0a',
      border: `1px solid ${isDone ? '#4ade8033' : '#f8717133'}`,
      borderLeft: `3px solid ${isDone ? '#4ade80' : '#f87171'}`,
      borderRadius: 8, padding: '12px 16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? '#4ade80' : '#f87171' }}>
          🔑 마스터 API 키 유출 인시던트 · {isDone ? '차단 완료' : '진행 중'}
        </span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[
            { label: '가짜 에이전트', value: agentCount.toLocaleString() + '개',  color: '#f87171' },
            { label: 'API 호출량',    value: apiRate.toLocaleString() + '회/분',  color: '#fb923c' },
            { label: '예상 피해액',   value: '$' + estimatedCost.toLocaleString(), color: '#f9ab00' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#0d0d1c', border: '1px solid #1a1a2e', borderRadius: 6,
              padding: '3px 10px', fontSize: 11,
            }}>
              <span style={{ color: '#475569' }}>{label} </span>
              <span style={{ color, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {visibleEvents.map(evt => (
          <div key={evt.time} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
            <span style={{ color: '#334155', fontFamily: 'monospace', flexShrink: 0 }}>[{evt.time}]</span>
            <span>
              <span style={{ color: evt.color, marginRight: 6 }}>●</span>
              <span style={{ color: '#94a3b8' }}>{evt.msg}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── helpers ── */
function normalizeAlert(a) {
  return { id: a.id, severity: a.severity ?? 'low' };
}

const STATUS_STYLE = {
  blocked:    { bg:'#f8717118', color:'#f87171', label:'차단됨'    },
  active:     { bg:'#f9ab0018', color:'#f9ab00', label:'활성'      },
  monitoring: { bg:'#60a5fa18', color:'#60a5fa', label:'모니터링'  },
};

const SEVERITY_STYLE = {
  critical: { bg:'#f8717128', color:'#f87171', label:'CRITICAL'  },
  high:     { bg:'#fb923c28', color:'#fb923c', label:'HIGH'      },
  medium:   { bg:'#f9ab0028', color:'#f9ab00', label:'MEDIUM'    },
  low:      { bg:'#4ade8028', color:'#4ade80', label:'LOW'       },
  token:    { bg:'#a78bfa28', color:'#a78bfa', label:'토큰 이상'  },
};

/* ── Page ── */
export default function SecurityPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.get('/alerts/', { params: { status: 'all', limit: 100 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setAlerts(list.map(normalizeAlert));
      })
      .catch(() => {});
  }, []);

  // ── 인시던트 시뮬레이션 자동 시작 ──
  // simProgress는 ref로 관리 — 50ms마다 리렌더 없음
  // currentHour만 state — 시간이 바뀔 때(~700ms마다)만 리렌더
  const simProgressRef = useRef(0);
  const [currentHour, setCurrentHour] = useState(0);

  useEffect(() => {
    const tid = setInterval(() => {
      const prev = simProgressRef.current;
      const next = Math.min(+(prev + 0.003).toFixed(4), 1);
      simProgressRef.current = next;
      const newHour = Math.min(Math.floor(next * 24), 23);
      if (newHour !== Math.min(Math.floor(prev * 24), 23)) setCurrentHour(newHour);
      if (next >= 1) clearInterval(tid);
    }, 50);
    return () => clearInterval(tid);
  }, []);

  // 위기 단계: currentHour 기반
  const phase = currentHour < 14 ? 0
    : currentHour < 15 ? 1
    : currentHour < 16 ? 2
    : currentHour < 17 ? 3 : 4;

  const crisisLevel = phase;

  const [logCounts, setLogCounts] = useState({ critical: 0, high: 0, medium: 0, low: 0, token: 0, blocked: 0 });
  const [countryCounts, setCountryCounts] = useState({});
  const [chartTick, setChartTick] = useState(0);

  const barData = [
    { name: 'CRITICAL 알림', value: logCounts.critical, color: '#f87171' },
    { name: 'HIGH 알림',     value: logCounts.high,     color: '#fb923c' },
    { name: 'MEDIUM 알림',   value: logCounts.medium,   color: '#f9ab00' },
    { name: 'LOW 알림',      value: logCounts.low,      color: '#4ade80' },
    { name: '차단된 IP',      value: logCounts.blocked,  color: '#60a5fa' },
    { name: '토큰 이상 감지', value: logCounts.token,    color: '#a78bfa' },
  ];

  // 로그 생성 — SecurityPage에서 직접 관리해 countryCounts와 동기화
  const [logs, setLogs] = useState([]);
  const [dotOn, setDotOn] = useState(true);
  const currentHourRef = useRef(0);
  useEffect(() => { currentHourRef.current = currentHour; }, [currentHour]);
  useEffect(() => {
    const t = setInterval(() => setDotOn(d => !d), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setChartTick(n => n + 1), 100);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    let tid;
    const schedule = () => {
      const hd = HOURLY_THREATS[Math.min(currentHourRef.current, 23)];
      const level = (hd?.normal ?? 0) + (hd?.attack ?? 0);
      const delay = level > 500 ?  60 + Math.random() *  60
        : level > 100 ? 100 + Math.random() *  80
        : level >  20 ? 200 + Math.random() * 150
        :               350 + Math.random() * 200;
      tid = setTimeout(() => {
        const pool = currentHourRef.current >= 14 ? INCIDENT_LOG_POOL : LOG_POOL;
        const entry = makeEntry(0, pool);
        setLogs(prev => [entry, ...prev].slice(0, 80));
        setLogCounts(prev => ({
          ...prev,
          [entry.severity]: (prev[entry.severity] ?? 0) + 1,
          ...(entry.status === 'blocked' ? { blocked: prev.blocked + 1 } : {}),
        }));
        const countryKey = entry.country.split(' (')[0];
        setCountryCounts(prev => ({ ...prev, [countryKey]: (prev[countryKey] ?? 0) + 1 }));
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(tid);
  }, []);

  // 시뮬레이션 진행 비율로 현재 시간대를 부드럽게 성장
  const liveChartData = useMemo(() => {
    const frac = Math.min(simProgressRef.current * 24 - currentHour, 1);
    return HOURLY_THREATS.map((d, i) => ({
      time:   d.time,
      normal: i < currentHour  ? d.normal
            : i === currentHour ? Math.round(d.normal * frac)
            : null,
      attack: i < currentHour  ? d.attack
            : i === currentHour ? Math.round(d.attack * frac)
            : null,
    }));
  }, [currentHour, chartTick]);

  // 글로벌 공격: 로그에 찍힌 국가만 표시, COUNTRY_META에 좌표 있는 것만
  const liveAttackCountries = Object.entries(countryCounts)
    .filter(([name, count]) => count > 0 && COUNTRY_META[name])
    .map(([name, count]) => ({
      country: name,
      lat:     COUNTRY_META[name].lat,
      lon:     COUNTRY_META[name].lon,
      attacks: count,
      color:   COUNTRY_META[name].color,
    }))
    .sort((a, b) => b.attacks - a.attacks);

  return (
    <div className="page" style={{ maxWidth: 1600 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">보안 모니터링</h1>
          <p className="page-sub">사이버 위협 탐지 · 글로벌 공격 추적 · 이상 징후를 실시간 모니터링합니다</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

        {/* ── Left ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Row 1: gauge + line chart */}
          <div style={{ display:'grid', gridTemplateColumns:'290px 1fr', gap:20 }}>

            <div className="analytics-card" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div className="analytics-card-header" style={{ width:'100%', marginBottom:4 }}>
                <h2 className="analytics-card-title">사이버 위기 단계</h2>
              </div>
              <CrisisGauge level={crisisLevel} />
              <div style={{ fontSize:11, color:'#334155', marginTop:4, letterSpacing:1 }}>
                정상 → 관심 → 주의 → 경계 → 심각
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <h2 className="analytics-card-title">시간별 위협 발생 건수</h2>
                <span style={{ fontSize:11, color:'#475569' }}>오늘 기준</span>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <ComposedChart data={liveChartData} margin={{ top:20, right:35, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false}/>
                  <XAxis dataKey="time" tick={{ fontSize:10, fill:'#475569' }} axisLine={false} tickLine={false} interval={3}/>
                  <YAxis width={52} tick={{ fontSize:10, fill:'#475569' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                  <Tooltip
                    contentStyle={{ background:'#0d0d1c', border:'1px solid #1a1a2e', borderRadius:8, fontSize:12 }}
                    formatter={(v, name) => v == null ? null : [
                      `${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}건`,
                      name === 'normal' ? '정상 트래픽' : '공격 트래픽',
                    ]}
                  />
                  <Area type="monotone" dataKey="normal"
                    stroke="#60a5fa" strokeWidth={1.5} fill="url(#normalGrad)"
                    isAnimationActive={false} connectNulls={false}/>
                  <Bar dataKey="attack" fill="#f87171" fillOpacity={0.85}
                    radius={[2,2,0,0]} isAnimationActive={false} maxBarSize={18}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: bar chart */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <h2 className="analytics-card-title">알림 현황</h2>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={barData} layout="vertical" margin={{ top:0, right:50, left:10, bottom:0 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize:11, fill:'#475569' }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={115}
                  tick={{ fontSize:12, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ background:'#0d0d1c', border:'1px solid #1a1a2e', borderRadius:8, fontSize:12 }}
                  formatter={(v) => [`${v}건`]}
                />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {barData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Row 3: full-width log feed */}
          <ThreatLogFeed logs={logs} dotOn={dotOn} />
        </div>

        {/* ── Right: Globe ── */}
        <div className="analytics-card" style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:20, padding:'16px 20px' }}>
          <div className="analytics-card-header" style={{ width:'100%', marginBottom:0 }}>
            <h2 className="analytics-card-title">글로벌 공격 현황</h2>
            <span style={{ fontSize:11, color:'#475569' }}>실시간 공격 경로</span>
          </div>

          <AttackMap attackSources={liveAttackCountries} />

          <div style={{ width:'100%' }}>
            <div style={{ fontSize:11, color:'#475569', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>공격 출처</div>
            {liveAttackCountries.map(c => (
              <div key={c.country} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid #0f0f1e' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0, display:'block' }}/>
                <span style={{ flex:1, fontSize:12, color:'#94a3b8' }}>{c.country}</span>
                <span style={{ fontSize:12, fontWeight:700, color:c.color }}>{c.attacks.toLocaleString()}건</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize:11, color:'#475569', textAlign:'center', lineHeight:1.6 }}>
            <span style={{ color:'#4ade80', fontWeight:600 }}>● 서울</span> 방어 대상&nbsp;&nbsp;·&nbsp;&nbsp;
            <span style={{ color:'#f87171', fontWeight:600 }}>● 공격 출처</span>
          </div>
        </div>
      </div>
    </div>
  );
}

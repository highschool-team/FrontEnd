import { useState, useEffect, useRef } from 'react';

const POLICIES = [
  {
    id: 1,
    trigger: 'OpenAI 호출',
    condition: '일일 예산 80% 이상 소진',
    action: 'GPT-4o → GPT-4o-mini 다운그레이드',
    type: 'budget',
    active: true,
  },
  {
    id: 2,
    trigger: 'Anthropic 호출',
    condition: 'API 오류 응답 (429 / 500)',
    action: 'Claude → GPT-4o 즉시 스위칭',
    type: 'failover',
    active: true,
  },
  {
    id: 3,
    trigger: 'OpenAI 호출',
    condition: '일일 예산 100% 소진',
    action: 'Anthropic Claude 3 Haiku 폴백',
    type: 'budget',
    active: false,
  },
];

export default function RoutingPolicyPage() {
  const [simProgress, setSimProgress] = useState(0);
  const [simPhase, setSimPhase] = useState('idle');
  const [activeRoute, setActiveRoute] = useState('primary');
  const intervalRef = useRef(null);

  const startSim = () => {
    setSimProgress(0);
    setActiveRoute('primary');
    setSimPhase('running');
  };

  useEffect(() => {
    if (simPhase !== 'running') return;
    intervalRef.current = setInterval(() => {
      setSimProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current);
          setSimPhase('done');
          return 100;
        }
        if (p === 80) setActiveRoute('fallback');
        return p + 1;
      });
    }, 60);
    return () => clearInterval(intervalRef.current);
  }, [simPhase]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">라우팅 정책</h1>
          <p className="page-sub">예산 소진·장애 발생 시 자동 모델 캐스케이딩 / 폴백 규칙을 설정하세요</p>
        </div>
        <button
          className={`sim-btn ${simPhase === 'running' ? 'sim-btn--stop' : ''}`}
          onClick={startSim}
          disabled={simPhase === 'running'}
        >
          {simPhase === 'running' ? '시뮬레이션 중...' : '▶ 라우팅 시뮬레이션'}
        </button>
      </div>

      {simPhase !== 'idle' && (
        <div className="routing-sim-box">
          <div className="sim-track">
            <div className={`sim-node ${activeRoute === 'primary' ? 'sim-node--active' : 'sim-node--inactive'}`}>
              GPT-4o
            </div>
            <div className={`sim-arrow ${activeRoute === 'fallback' ? 'sim-arrow--switched' : ''}`}>
              {activeRoute === 'primary' ? '─────▶' : '─ ─ ─▶'}
            </div>
            <div className={`sim-node ${activeRoute === 'fallback' ? 'sim-node--active' : 'sim-node--dimmed'}`}>
              GPT-4o-mini
            </div>
          </div>
          <div className="sim-meter-wrap">
            <span className="sim-meter-label">예산 소진율</span>
            <div className="sim-meter-bg">
              <div
                className={`sim-meter-fill ${simProgress >= 80 ? 'fill--red' : simProgress >= 50 ? 'fill--orange' : 'fill--green'}`}
                style={{ width: `${simProgress}%` }}
              />
              <span className="sim-meter-threshold">80%</span>
            </div>
            <span className="sim-meter-val">{simProgress}%</span>
          </div>
          {simProgress >= 80 && (
            <div className="sim-event">
              ⚡ 80% 도달 — GPT-4o → GPT-4o-mini 자동 다운그레이드 전이됨
            </div>
          )}
        </div>
      )}

      <div className="policy-list">
        <div className="policy-list-header">
          <span>트리거</span>
          <span>조건</span>
          <span>액션</span>
          <span>유형</span>
          <span>활성화</span>
        </div>
        {POLICIES.map((p) => (
          <div key={p.id} className="policy-row">
            <span className="policy-trigger">{p.trigger}</span>
            <span className="policy-condition">{p.condition}</span>
            <span className="policy-action">{p.action}</span>
            <span className={`policy-type-badge ${p.type === 'budget' ? 'badge--blue' : 'badge--purple'}`}>
              {p.type === 'budget' ? '예산 캐스케이딩' : '장애 폴백'}
            </span>
            <span className={`status-badge ${p.active ? 'status--active' : 'status--blocked'}`}>
              {p.active ? 'ON' : 'OFF'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

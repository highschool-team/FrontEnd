import { useState, useEffect, useRef } from 'react';

const SERVICES = [
  { id: 'google', name: 'Google Workspace' },
  { id: 'slack', name: 'Slack' },
  { id: 'figma', name: 'Figma' },
  { id: 'github', name: 'GitHub' },
  { id: 'notion', name: 'Notion' },
];

const EMPLOYEES = ['홍길동', '이영희', '박민준', '김수진', '최현우'];
const ASSIGNEES = ['김철수', '정다은', '강민서', '윤재원'];

function getSteps(mode) {
  return SERVICES.map((s, i) => ({
    ...s,
    delay: i * 1000 + 400,
    hold: mode === 'off' && s.id === 'figma',
  }));
}

export default function ProvisioningPage() {
  const [employee, setEmployee] = useState('');
  const [mode, setMode] = useState('off');
  const [running, setRunning] = useState(false);
  const [stepStatus, setStepStatus] = useState({});
  const [pausedAt, setPausedAt] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [done, setDone] = useState(false);
  const timerRefs = useRef([]);

  const reset = () => {
    timerRefs.current.forEach(clearTimeout);
    setRunning(false);
    setStepStatus({});
    setPausedAt(null);
    setShowTransfer(false);
    setAssignee('');
    setDone(false);
  };

  const start = () => {
    if (!employee) return;
    reset();
    setRunning(true);

    const steps = getSteps(mode);
    steps.forEach((step) => {
      const t = setTimeout(() => {
        if (step.hold) {
          setStepStatus((p) => ({ ...p, [step.id]: 'paused' }));
          setPausedAt(step.id);
          setShowTransfer(true);
        } else {
          setStepStatus((p) => ({ ...p, [step.id]: 'done' }));
        }
      }, step.delay);
      timerRefs.current.push(t);
    });
  };

  const resumeAfterTransfer = () => {
    if (!assignee) return;
    setShowTransfer(false);
    setStepStatus((p) => ({ ...p, figma: 'done' }));
    setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, 600);
  };

  const allDoneWithoutHold =
    running &&
    !showTransfer &&
    Object.keys(stepStatus).length === SERVICES.length &&
    Object.values(stepStatus).every((s) => s === 'done');

  useEffect(() => {
    if (allDoneWithoutHold) {
      setRunning(false);
      setDone(true);
    }
  }, [allDoneWithoutHold]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">프로비저닝</h1>
          <p className="page-sub">입·퇴사자 SaaS 계정을 일괄 생성 / 해제하고 자산을 안전하게 이관하세요</p>
        </div>
      </div>

      <div className="prov-form">
        <div className="prov-form-row">
          <label className="prov-label">대상 사원</label>
          <select
            className="prov-select"
            value={employee}
            onChange={(e) => { reset(); setEmployee(e.target.value); }}
          >
            <option value="">사원을 선택하세요</option>
            {EMPLOYEES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="prov-form-row">
          <label className="prov-label">프로세스 유형</label>
          <div className="prov-mode-toggle">
            <button
              className={`mode-btn ${mode === 'off' ? 'mode-btn--active-red' : ''}`}
              onClick={() => { reset(); setMode('off'); }}
            >
              퇴사 (Offboarding)
            </button>
            <button
              className={`mode-btn ${mode === 'on' ? 'mode-btn--active-blue' : ''}`}
              onClick={() => { reset(); setMode('on'); }}
            >
              입사 (Onboarding)
            </button>
          </div>
        </div>
        <button
          className={`sim-btn ${running ? 'sim-btn--stop' : ''}`}
          onClick={running ? reset : start}
          disabled={!employee}
        >
          {running ? '⏹ 중지' : `▶ ${mode === 'off' ? '퇴사' : '입사'} 프로세스 실행`}
        </button>
      </div>

      {(running || done || Object.keys(stepStatus).length > 0) && (
        <div className="prov-nodes">
          {SERVICES.map((s) => {
            const status = stepStatus[s.id];
            return (
              <div
                key={s.id}
                className={`prov-node ${status === 'done' ? 'prov-node--done' : status === 'paused' ? 'prov-node--paused' : running ? 'prov-node--pending' : ''}`}
              >
                <span className="prov-node-icon">
                  {status === 'done' ? '✓' : status === 'paused' ? '!' : '…'}
                </span>
                <span className="prov-node-name">{s.name}</span>
                <span className="prov-node-status">
                  {status === 'done'
                    ? (mode === 'off' ? '계정 해제됨' : '계정 생성됨')
                    : status === 'paused'
                    ? '⚠ 자산 확인 필요'
                    : '대기 중'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showTransfer && (
        <div className="transfer-modal-overlay">
          <div className="transfer-modal">
            <h3 className="transfer-title">⚠ 자산 이관 필요 — 프로세스 일시 중지됨</h3>
            <p className="transfer-desc">
              <strong>{employee}</strong> 사원의 Figma에 작성 중인 파일 5개가 존재합니다.
              계정 삭제 전 소유권을 이관할 담당자를 지정하세요.
            </p>
            <div className="transfer-row">
              <span className="transfer-from">{employee}의 Figma 파일</span>
              <span className="transfer-arrow">→</span>
              <select
                className="prov-select"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">이관 대상 선택</option>
                {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button
              className="sim-btn"
              onClick={resumeAfterTransfer}
              disabled={!assignee}
            >
              이관 완료 — 프로세스 재개
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="prov-done-banner">
          ✅ {employee} 사원 {mode === 'off' ? '퇴사' : '입사'} 프로세스가 완료되었습니다.
          {assignee && ` Figma 파일은 ${assignee}에게 이관되었습니다.`}
        </div>
      )}
    </div>
  );
}

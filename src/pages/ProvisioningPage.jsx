import { useState, useEffect, useRef } from 'react';
import api from '../api/index.js';

const SERVICES = [
  { id: 'google', name: 'Google Workspace' },
  { id: 'slack',  name: 'Slack' },
  { id: 'figma',  name: 'Figma' },
  { id: 'github', name: 'GitHub' },
  { id: 'notion', name: 'Notion' },
];

const ASSIGNEES = ['김철수', '정다은', '강민서', '윤재원'];

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Map backend step status to UI status
function mapStepStatus(status) {
  if (status === 'done' || status === 'completed') return 'done';
  if (status === 'failed') return 'failed';
  if (status === 'processing') return 'processing';
  return 'pending';
}

// Find the service object by matching backend service name
function findService(serviceName) {
  const lower = (serviceName ?? '').toLowerCase();
  return SERVICES.find((s) =>
    lower.includes(s.id) || s.name.toLowerCase().includes(lower)
  ) ?? null;
}

export default function ProvisioningPage() {
  const [employee, setEmployee]       = useState('');
  const [mode, setMode]               = useState(null);
  const [running, setRunning]         = useState(false);
  const [stepStatus, setStepStatus]   = useState({});
  const [showTransfer, setShowTransfer] = useState(false);
  const [assignee, setAssignee]       = useState('');
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState('');
  const [taskId, setTaskId]           = useState(null);
  const sseAbortRef = useRef(null);

  const reset = () => {
    sseAbortRef.current?.abort();
    setRunning(false);
    setStepStatus({});
    setShowTransfer(false);
    setAssignee('');
    setDone(false);
    setError('');
    setTaskId(null);
  };

  // SSE streaming for task progress
  const connectSSE = (tid, offboardingFigma) => {
    const token = localStorage.getItem('access_token');
    const controller = new AbortController();
    sseAbortRef.current = controller;

    fetch(`/api/provisioning/tasks/${tid}/stream/`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then((res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const read = () => {
        reader.read().then(({ done: streamDone, value }) => {
          if (streamDone) {
            setRunning(false);
            setDone(true);
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          parts.forEach((chunk) => {
            const line = chunk.trim();
            if (line.startsWith('data:')) {
              try {
                const payload = JSON.parse(line.slice(5).trim());
                // payload: { step, step_status, overall_status, steps }
                if (payload.steps) {
                  // Full steps array update
                  const newStatus = {};
                  payload.steps.forEach((s) => {
                    const svc = findService(s.service);
                    if (svc) {
                      const uiStatus = mapStepStatus(s.status);
                      newStatus[svc.id] = uiStatus;
                      // Figma offboarding pauses for asset transfer
                      if (offboardingFigma && svc.id === 'figma' && s.status === 'processing') {
                        setShowTransfer(true);
                        newStatus[svc.id] = 'paused';
                      }
                    }
                  });
                  setStepStatus(newStatus);
                } else if (payload.step) {
                  // Single step update
                  const svc = findService(payload.step);
                  if (svc) {
                    const uiStatus = mapStepStatus(payload.step_status);
                    if (offboardingFigma && svc.id === 'figma' && payload.step_status === 'processing') {
                      setStepStatus((prev) => ({ ...prev, [svc.id]: 'paused' }));
                      setShowTransfer(true);
                    } else {
                      setStepStatus((prev) => ({ ...prev, [svc.id]: uiStatus }));
                    }
                  }
                }
                if (payload.overall_status === 'done' || payload.overall_status === 'completed') {
                  if (!offboardingFigma) {
                    setRunning(false);
                    setDone(true);
                  }
                } else if (payload.overall_status === 'failed') {
                  setRunning(false);
                  setError('프로세스 중 오류가 발생했습니다.');
                }
              } catch {
                // ignore malformed events
              }
            }
          });
          read();
        }).catch(() => {
          setRunning(false);
        });
      };
      read();
    }).catch(() => {
      setRunning(false);
      setError('스트림 연결에 실패했습니다.');
    });
  };

  // Poll task status as fallback
  const pollTask = (tid, offboardingFigma) => {
    const poll = async () => {
      try {
        const { data } = await api.get(`/provisioning/tasks/${tid}/`);
        const newStatus = {};
        (data.steps ?? []).forEach((s) => {
          const svc = findService(s.service);
          if (svc) {
            const uiStatus = mapStepStatus(s.status);
            newStatus[svc.id] = uiStatus;
            if (offboardingFigma && svc.id === 'figma' && s.status === 'processing') {
              newStatus[svc.id] = 'paused';
              setShowTransfer(true);
            }
          }
        });
        setStepStatus(newStatus);
        if (data.status === 'done' || data.status === 'completed') {
          if (!offboardingFigma) {
            setRunning(false);
            setDone(true);
          }
        } else if (data.status === 'failed') {
          setRunning(false);
          setError('프로세스 중 오류가 발생했습니다.');
        } else {
          setTimeout(poll, 1000);
        }
      } catch {
        setTimeout(poll, 2000);
      }
    };
    poll();
  };

  const start = async () => {
    if (!employee || !mode) return;
    reset();
    setRunning(true);

    try {
      let res;
      if (mode === 'on') {
        res = await api.post('/provisioning/onboard/', { email: employee });
      } else {
        res = await api.post('/provisioning/offboard/', {
          email: employee,
          figma_transfer_to: assignee || undefined,
        });
      }
      const tid = res.data.task_id;
      setTaskId(tid);
      const offboardingFigma = mode === 'off';
      // Try SSE first, fall back to polling if stream endpoint not available
      try {
        connectSSE(tid, offboardingFigma);
      } catch {
        pollTask(tid, offboardingFigma);
      }
    } catch (e) {
      setRunning(false);
      const msg = e.response?.data?.detail ?? e.response?.data?.message ?? '요청에 실패했습니다.';
      setError(msg);
    }
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

  useEffect(() => {
    return () => sseAbortRef.current?.abort();
  }, []);

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
          <label className="prov-label">이메일</label>
          <input
            className="prov-email-input"
            type="email"
            placeholder="name@company.com"
            value={employee}
            onChange={(e) => { reset(); setEmployee(e.target.value); }}
          />
        </div>
        <div className="prov-form-row">
          <label className="prov-label">프로세스 유형</label>
          <div className="prov-mode-toggle">
            <button
              className={`mode-btn ${mode === 'on' ? 'mode-btn--active-blue' : ''}`}
              onClick={() => { reset(); setMode('on'); }}
            >
              입사 (Onboarding)
            </button>
            <button
              className={`mode-btn ${mode === 'off' ? 'mode-btn--active-red' : ''}`}
              onClick={() => { reset(); setMode('off'); }}
            >
              퇴사 (Offboarding)
            </button>
          </div>
        </div>
        <button
          className={`sim-btn ${running ? 'sim-btn--stop' : ''}`}
          onClick={running ? reset : start}
          disabled={!isValidEmail(employee) || !mode}
        >
          {running ? '⏹ 중지' : `▶ ${mode === 'off' ? '퇴사' : '입사'} 프로세스 실행`}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fce8e6', color: '#ea4335', borderRadius: 8, padding: '10px 16px', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

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
                  {status === 'done' ? '✓' : status === 'paused' ? '!' : status === 'failed' ? '✗' : '…'}
                </span>
                <span className="prov-node-name">{s.name}</span>
                <span className="prov-node-status">
                  {status === 'done'
                    ? (mode === 'off' ? '계정 해제됨' : '계정 생성됨')
                    : status === 'paused'
                    ? '⚠ 자산 확인 필요'
                    : status === 'failed'
                    ? '오류 발생'
                    : status === 'processing'
                    ? '처리 중...'
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
              <strong>{employee}</strong> 계정의 Figma에 작성 중인 파일이 존재합니다.
              계정 삭제 전 소유권을 이관할 담당자를 지정하세요.
            </p>
            <div className="transfer-row">
              <span className="transfer-from">{employee} Figma 파일</span>
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
          {employee} {mode === 'off' ? '퇴사' : '입사'} 프로세스가 완료되었습니다.
          {assignee && ` Figma 파일은 ${assignee}에게 이관되었습니다.`}
        </div>
      )}
    </div>
  );
}

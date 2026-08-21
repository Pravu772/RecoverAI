import { useState } from 'react';
import { generateBatch, classifyBatch, recoverBatch, advanceTime } from '../api/index.js';
import { IconDatabase, IconBrain, IconZap, IconFastForward, IconPlay, IconArrowRight } from './Icons.jsx';

const STEPS = [
  { id: 'generate', label: 'Generate',  sub: '50 synthetic transactions', Icon: IconDatabase },
  { id: 'classify', label: 'Classify',  sub: 'AI + rule-based',           Icon: IconBrain },
  { id: 'recover',  label: 'Recover',   sub: 'Execute actions',           Icon: IconZap },
];

const StepDot = ({ step, status }) => {
  const { Icon } = step;
  const styles = {
    idle:   { border: 'var(--color-border)', color: 'var(--color-text-muted)', bg: 'var(--color-bg)' },
    active: { border: 'var(--color-accent)',  color: 'var(--color-accent)',  bg: '#eff6ff' },
    done:   { border: '#059669',             color: '#059669',              bg: '#ecfdf5' },
    error:  { border: '#dc2626',             color: '#dc2626',              bg: '#fef2f2' },
  };
  const s = styles[status] || styles.idle;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300"
        style={{ borderColor: s.border, background: s.bg, color: s.color }}
      >
        {status === 'active' ? (
          <div className="spinner" style={{ width: 12, height: 12 }} />
        ) : status === 'done' ? (
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="2 8 6 12 14 4" />
          </svg>
        ) : status === 'error' ? (
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
          </svg>
        ) : (
          <Icon className="w-3.5 h-3.5" />
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold" style={{
          color: status === 'done' ? '#059669' : status === 'active' ? 'var(--color-accent)' : 'var(--color-text-secondary)'
        }}>
          {step.label}
        </p>
        <p className="text-2xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
          {step.sub}
        </p>
      </div>
    </div>
  );
};

const BatchDemoButton = ({ onComplete, count = 50 }) => {
  const [running,      setRunning]      = useState(false);
  const [statuses,     setStatuses]     = useState({ generate: 'idle', classify: 'idle', recover: 'idle' });
  const [message,      setMessage]      = useState('');
  const [error,        setError]        = useState(null);
  const [result,       setResult]       = useState(null);
  const [advancingTime, setAdvancingTime] = useState(false);

  const set = (id, status) => setStatuses(p => ({ ...p, [id]: status }));

  const runDemo = async () => {
    setRunning(true); setError(null); setResult(null);
    setStatuses({ generate: 'idle', classify: 'idle', recover: 'idle' });

    try {
      set('generate', 'active');
      setMessage(`Generating ${count} synthetic failed transactions…`);
      await generateBatch(count);
      set('generate', 'done');

      set('classify', 'active');
      setMessage('Classifying transactions with AI and rule engine…');
      await classifyBatch();
      set('classify', 'done');

      set('recover', 'active');
      setMessage('Executing recovery actions…');
      const r = await recoverBatch();
      set('recover', 'done');

      setResult(r.summary);
      setMessage('');
      onComplete?.();
    } catch (e) {
      setError(e.message);
      setStatuses(p => {
        const u = { ...p };
        Object.keys(u).forEach(k => { if (u[k] === 'active') u[k] = 'error'; });
        return u;
      });
      setMessage('');
    } finally {
      setRunning(false);
    }
  };

  const handleAdvanceTime = async () => {
    setAdvancingTime(true);
    try {
      const r = await advanceTime(2);
      onComplete?.();
      alert(`Time advanced by 2 days.\nSimulated time: ${new Date(r.current_simulated_time).toLocaleString('en-IN')}`);
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setAdvancingTime(false);
    }
  };

  const allDone = Object.values(statuses).every(s => s === 'done');

  return (
    <div className="card p-5 flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo-icon.png" alt="RecoverAI" className="w-6 h-6 object-contain rounded-md" />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Autonomous Recovery Engine
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              3-stage bounded pipeline execution
            </p>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-start">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-start flex-1">
            <div className="flex-1 flex flex-col items-center">
              <StepDot step={step} status={statuses[step.id]} />
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="step-connector"
                style={{
                  background: statuses[STEPS[i + 1].id] !== 'idle' ? 'var(--color-accent)' : 'var(--color-border)'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Status message */}
      {message && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs"
          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: 'var(--color-accent)' }}
        >
          <div className="spinner flex-shrink-0" style={{ color: 'var(--color-accent)', width: 12, height: 12 }} />
          {message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-md text-xs"
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Success summary */}
      {result && !running && (
        <div className="px-4 py-3 rounded-lg"
          style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#059669' }}>Run complete</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Processed', value: result.total_processed },
              { label: 'Recovered', value: result.recovered_count, accent: true },
              { label: 'Rate',      value: `${result.recovery_rate}%` },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xs" style={{ color: '#065f46' }}>{stat.label}</p>
                <p className="text-sm font-bold" style={{ color: stat.accent ? '#059669' : '#065f46' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          id="btn-run-demo"
          onClick={runDemo}
          disabled={running}
          className="btn-primary flex-1 justify-center"
        >
          {running ? (
            <><div className="spinner" /><span>Running…</span></>
          ) : (
            <><IconPlay className="w-3.5 h-3.5" /><span>Run Full Demo</span></>
          )}
        </button>
        <button
          id="btn-advance-time"
          onClick={handleAdvanceTime}
          disabled={running || advancingTime}
          className="btn-secondary"
          title="Advance simulated time by 2 days to unlock scheduled retries"
        >
          {advancingTime
            ? <div className="spinner" />
            : <IconFastForward className="w-3.5 h-3.5" />
          }
          <span className="hidden sm:inline">+2 Days</span>
        </button>
      </div>

      <p className="text-2xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Click any row to open audit trail — use +2 Days to unlock scheduled retries
      </p>
    </div>
  );
};

export default BatchDemoButton;

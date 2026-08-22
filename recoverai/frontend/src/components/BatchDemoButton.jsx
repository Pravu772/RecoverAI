import { useState } from 'react';
import { generateBatch, classifyBatch, recoverBatch, advanceTime } from '../api/index.js';
import { IconDatabase, IconBrain, IconZap, IconFastForward, IconPlay, IconArrowRight } from './Icons.jsx';
import LoadingInline from './LoadingInline.jsx';

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

const BatchDemoButton = ({ onComplete, onOpenReport, count = 50 }) => {
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
      if (onComplete) {
        await onComplete();
      }
      // Automatically open the Batch Report modal as hero result
      if (onOpenReport) {
        setTimeout(() => onOpenReport(), 400);
      }

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
      setMessage(`Simulated clock advanced +48 hours (Evaluating PTP & unlocks)`);
      setTimeout(() => setMessage(''), 3500);
    } catch (e) {
      setError(e.message);
    } finally {
      setAdvancingTime(false);
    }
  };

  const allDone = Object.values(statuses).every(s => s === 'done');

  return (
    <div className="card p-5 flex flex-col gap-4 bg-white border border-slate-200 shadow-xs">
      {/* Title */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo-icon.png" alt="RecoverAI" className="w-6 h-6 object-contain rounded-md" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Autonomous Recovery Pipeline
            </h3>
            <p className="text-2xs text-slate-500 mt-0.5">
              Deterministic routing & LLM bounded execution
            </p>
          </div>
        </div>

        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="text-3xs font-mono font-bold uppercase tracking-wider px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
            title="Inspect comprehensive batch recovery results report"
          >
            Batch Report ↗
          </button>
        )}
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

      {/* Status message with inline loading indicator */}
      {running && (
        <LoadingInline
          isLoading={running}
          label={message || 'Executing AI Recovery Pipeline…'}
          size="sm"
          minHeight="64px"
        />
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800">
          {error}
        </div>
      )}

      {/* Success summary */}
      {result && !running && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-emerald-800">Execution Batch Complete</p>
            {onOpenReport && (
              <button
                onClick={onOpenReport}
                className="text-2xs font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                View Full Batch Report →
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Processed', value: result.total_processed },
              { label: 'Recovered', value: result.recovered_count, accent: true },
              { label: 'Rate',      value: `${result.recovery_rate}%` },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xs text-emerald-700 font-medium">{stat.label}</p>
                <p className="text-sm font-bold font-mono text-emerald-900">
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
          className={`flex-1 justify-center text-xs py-2.5 px-4 rounded-xl font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
            running
              ? 'shimmer-wave text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 active:translate-y-0.5 text-white'
          }`}
        >
          {running ? (
            <><div className="spinner text-white" /><span>Executing AI Recovery Pipeline…</span></>
          ) : (
            <><IconPlay className="w-3.5 h-3.5 text-white" /><span>Run Full Recovery Cycle</span></>
          )}
        </button>
        <button
          id="btn-advance-time"
          onClick={handleAdvanceTime}
          disabled={running || advancingTime}
          className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          title="Advance simulated clock by 2 days to test cooldown & evaluate PTP deadlines"
        >
          {advancingTime
            ? <div className="spinner" />
            : <IconFastForward className="w-3.5 h-3.5 text-indigo-600" />
          }
          <span className="hidden sm:inline">+48h Clock</span>
        </button>
      </div>

      <p className="text-2xs text-center text-slate-400">
        Select any record to view audit provenance and trigger voice simulation
      </p>
    </div>
  );
};


export default BatchDemoButton;

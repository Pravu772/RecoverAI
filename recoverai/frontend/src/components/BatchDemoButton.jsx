import { useState } from 'react';
import { generateBatch, classifyBatch, recoverBatch, advanceTime } from '../api/index.js';

const STEPS = [
  { id: 'generate',  label: 'Generate Batch',  icon: '🎲', desc: '50 synthetic failed transactions' },
  { id: 'classify',  label: 'Classify All',    icon: '🧠', desc: 'AI + rule-based classification' },
  { id: 'recover',   label: 'Run Recovery',    icon: '⚡', desc: 'Execute recovery actions' },
];

const StepIndicator = ({ step, status }) => {
  const colors = {
    idle:    'border-surface-500 text-slate-500 bg-surface-700',
    active:  'border-primary-500 text-primary-400 bg-primary-500/10 animate-pulse-glow',
    done:    'border-emerald-500 text-emerald-400 bg-emerald-500/10',
    error:   'border-rose-500 text-rose-400 bg-rose-500/10',
  };

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg transition-all duration-300 ${colors[status]}`}>
        {status === 'done' ? '✓' : status === 'error' ? '✗' : step.icon}
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold ${status === 'done' ? 'text-emerald-400' : status === 'active' ? 'text-primary-400' : 'text-slate-500'}`}>
          {step.label}
        </p>
        <p className="text-xs text-slate-600 hidden sm:block">{step.desc}</p>
      </div>
    </div>
  );
};

/**
 * BatchDemoButton — orchestrates the full demo flow in sequence.
 * Generate → Classify → Recover with live progress and status.
 */
const BatchDemoButton = ({ onComplete, count = 50 }) => {
  const [running, setRunning] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({ generate: 'idle', classify: 'idle', recover: 'idle' });
  const [currentMessage, setCurrentMessage] = useState('');
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const updateStep = (stepId, status) => {
    setStepStatuses(prev => ({ ...prev, [stepId]: status }));
  };

  const runFullDemo = async () => {
    setRunning(true);
    setError(null);
    setLastResult(null);
    setStepStatuses({ generate: 'idle', classify: 'idle', recover: 'idle' });

    try {
      // Step 1: Generate
      updateStep('generate', 'active');
      setCurrentMessage(`Generating ${count} synthetic failed transactions…`);
      const genResult = await generateBatch(count);
      updateStep('generate', 'done');

      // Step 2: Classify
      updateStep('classify', 'active');
      setCurrentMessage('Classifying transactions (AI + rule-based)… this may take 5–15s');
      const classifyResult = await classifyBatch();
      updateStep('classify', 'done');

      // Step 3: Recover
      updateStep('recover', 'active');
      setCurrentMessage('Executing recovery actions…');
      const recoverResult = await recoverBatch();
      updateStep('recover', 'done');

      setLastResult(recoverResult.summary);
      setCurrentMessage('');
      onComplete?.();
    } catch (err) {
      setError(err.message);
      // Mark in-progress steps as error
      setStepStatuses(prev => {
        const updated = { ...prev };
        for (const k in updated) {
          if (updated[k] === 'active') updated[k] = 'error';
        }
        return updated;
      });
      setCurrentMessage('');
    } finally {
      setRunning(false);
    }
  };

  const handleAdvanceTime = async () => {
    try {
      const result = await advanceTime(2);
      alert(`⏩ Time advanced by 2 days!\nSimulated time: ${new Date(result.current_simulated_time).toLocaleString('en-IN')}\n\nYou can now re-run recovery for scheduled_retry_2days transactions.`);
      onComplete?.();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <span className="text-xl">🚀</span>
            Live Demo Controls
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Run the full recovery pipeline in ~30 seconds</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-start gap-2 relative">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-start gap-2 flex-1">
            <StepIndicator step={step} status={stepStatuses[step.id]} />
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mt-5 transition-colors duration-500 ${
                stepStatuses[STEPS[i + 1].id] !== 'idle' ? 'bg-primary-500' : 'bg-surface-500'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Progress message */}
      {currentMessage && (
        <div className="flex items-center gap-2 text-xs text-primary-400 bg-primary-500/10 border border-primary-500/20 rounded-lg px-3 py-2">
          <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          {currentMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          ❌ {error}
        </div>
      )}

      {/* Success result */}
      {lastResult && !running && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm">
          <p className="text-emerald-400 font-semibold mb-1">✅ Demo Complete!</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-slate-500">Processed:</span> <span className="text-slate-200">{lastResult.total_processed}</span></div>
            <div><span className="text-slate-500">Recovered:</span> <span className="text-emerald-400 font-bold">{lastResult.recovered_count}</span></div>
            <div><span className="text-slate-500">Rate:</span> <span className="text-teal-400 font-bold">{lastResult.recovery_rate}%</span></div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          id="btn-run-demo"
          onClick={runFullDemo}
          disabled={running}
          className="btn-primary flex items-center gap-2 flex-1 justify-center"
        >
          {running ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running…
            </>
          ) : (
            <>🚀 Run Full Demo</>
          )}
        </button>

        <button
          id="btn-advance-time"
          onClick={handleAdvanceTime}
          disabled={running}
          className="btn-outline flex items-center gap-2"
          title="Fast-forward 2 days for scheduled_retry_2days cooldown"
        >
          ⏩ +2 Days
        </button>
      </div>

      <p className="text-xs text-slate-600 text-center">
        Click individual rows to see full audit trail • Use ⏩ to unlock scheduled retries
      </p>
    </div>
  );
};

export default BatchDemoButton;

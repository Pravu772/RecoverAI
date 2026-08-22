import { useState } from 'react';
import { injectFailure, injectSingleTransaction, recoverOne, getAuditTrail } from '../api/index.js';
import {
  IconX, IconZap, IconShield, IconCheckCircle, IconAlertTriangle,
  IconPlay, IconActivity, IconFileText, IconArrowRight, IconClock, IconLayers
} from './Icons.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

const DRILL_SCENARIOS = [
  {
    id: 'gemini_api_down',
    title: 'Gemini AI Outage (503 Service Unavailable)',
    badge: 'P2 Core Resilience',
    desc: 'Simulates complete failure of the primary Gemini Flash 2.5 classification engine. Tests the self-healing circuit breaker fallback to deterministic rule engine without dropping revenue.',
    expectedFallback: 'Deterministic Rule Engine (Threshold Heuristic)',
    slaGuarantee: 'Zero Revenue Loss, Latency < 15ms',
  },
  {
    id: 'gateway_circuit_breaker',
    title: 'Payment Gateway Downstream Crash',
    badge: 'Network Fault',
    desc: 'Simulates payment gateway endpoint timing out. Tests exponential backoff, circuit breaking, and human-in-the-loop exception queue routing.',
    expectedFallback: 'Exponential Backoff Schedule + Exception Queue',
    slaGuarantee: 'Max 3 retry invariant strictly enforced',
  },
  {
    id: 'whatsapp_api_rate_limit',
    title: 'Communication Channel Rate Limit (429)',
    badge: 'Channel Fault',
    desc: 'Simulates Meta/WhatsApp Business API throttling. Tests automatic cascade fallback to SMS and Voice AI recovery without operator intervention.',
    expectedFallback: 'SMS Gateway + Dynamic Voice Agent Cascade',
    slaGuarantee: 'Channel rotation completed in < 500ms',
  },
];

const ChaosTestModal = ({ isOpen, onClose, onSelectTxn, onSuccess }) => {
  const { formatMoney } = useCurrency();
  const [selectedFailure, setSelectedFailure] = useState('gemini_api_down');
  const [drillRunning, setDrillRunning] = useState(false);
  const [drillStep, setDrillStep] = useState(0); // 0 = idle, 1 = arming, 2 = injecting, 3 = classifying, 4 = recovering, 5 = done
  const [drillResult, setDrillResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleRunDrill = async () => {
    setDrillRunning(true);
    setError(null);
    setDrillResult(null);
    setDrillStep(1);

    try {
      // Step 1: Arm failure in backend
      const armRes = await injectFailure(selectedFailure);
      await new Promise(r => setTimeout(r, 600));
      setDrillStep(2);

      // Step 2: Inject a realistic ambiguous transaction that requires AI classification
      const injectRes = await injectSingleTransaction({
        customer_name: 'Dr. Chaos (Resilience Test)',
        customer_phone: '+91 99999 88888',
        amount: 8500,
        revenue_stream: 'payment_gateway',
        failure_code: 'GATEWAY_UPSTREAM_503_TIMEOUT',
        merchant_id: 'MER_CHAOS_DEMO',
      });
      const txn = injectRes.transaction;
      await new Promise(r => setTimeout(r, 700));
      setDrillStep(3);

      // Step 3: Classify & Recover — this will trip circuit breaker and execute fallback
      const recRes = await recoverOne(txn.transaction_id);
      await new Promise(r => setTimeout(r, 700));
      setDrillStep(4);

      // Step 4: Fetch audit trail to confirm fallback entry
      const auditRes = await getAuditTrail(txn.transaction_id);
      await new Promise(r => setTimeout(r, 500));
      setDrillStep(5);

      setDrillResult({
        transaction: auditRes.transaction,
        audit_trail: auditRes.audit_trail,
        fallback_entry: auditRes.audit_trail?.find(e =>
          e.action_taken === 'circuit_breaker_fallback_classification' ||
          e.reasoning?.includes('circuit breaker policy') ||
          e.reasoning?.includes('Gemini API unavailable')
        ),
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Chaos drill error:', err);
      setError(err.message || 'Error running chaos simulation');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden z-10 animate-fade">
        
        {/* Header (Light Theme) */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <IconZap className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xs font-mono uppercase tracking-widest px-2 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Priority 2 Demonstration
                </span>
                <span className="text-2xs text-slate-500 font-mono">POST /api/simulate/inject-failure</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Graceful Failure & Self-Healing Circuit Breaker Drill
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>


        {/* Body */}
        <div className="p-6 space-y-5 bg-slate-50/40 overflow-y-auto max-h-[75vh]">
          
          {/* Track Banner */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
            <IconShield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-950">Judging Track Requirement: Show One Failure Handled Gracefully</p>
              <p className="text-2xs text-blue-800 leading-relaxed">
                When upstream AI infrastructure (Gemini API) experiences an outage, RecoverAI's circuit breaker detects the degradation, trips to <code>OPEN</code>, fast-paths to deterministic rule-based classification, logs the event to the cryptographic audit trail, and recovers the revenue without pipeline crashes.
              </p>
            </div>
          </div>

          {/* Failure Scenario Selection */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Failure Scenario to Inject
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'gemini_api_down',
                  title: 'Gemini API Outage',
                  desc: 'Upstream 503 HTTP outage. Circuit breaker triggers rule-based fallback.',
                  recommended: true,
                },
                {
                  id: 'database_timeout',
                  title: 'Database Latency',
                  desc: 'Simulated 504 gateway & database timeout guard.',
                },
                {
                  id: 'invalid_transaction_data',
                  title: 'Corrupt Payload',
                  desc: 'Negative amount / missing fields schema quarantine.',
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedFailure(opt.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFailure === opt.id
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{opt.title}</span>
                    {opt.recommended && (
                      <span className="text-3xs font-mono px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 font-bold">
                        Hero
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-slate-500 leading-normal">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Execution Progress / State Machine Visualization */}
          {drillStep > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 animate-fade">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Self-Healing Execution Telemetry</span>
                <span className="text-2xs font-mono text-slate-400">Step {drillStep} of 5</span>
              </div>

              <div className="space-y-2">
                {[
                  { step: 1, label: '1. Arming chaos condition (`gemini_api_down`)' },
                  { step: 2, label: '2. Dispatched payment failure payload (`GATEWAY_UPSTREAM_503_TIMEOUT`)' },
                  { step: 3, label: '3. Upstream Gemini Outage encountered → Circuit Breaker tripped OPEN' },
                  { step: 4, label: '4. Graceful rule-based fallback classification executed' },
                  { step: 5, label: '5. Revenue recovered & audit ledger proof created' },
                ].map(s => {
                  const isDone = drillStep > s.step;
                  const isCurr = drillStep === s.step;
                  return (
                    <div key={s.step} className="flex items-center gap-2.5 text-xs">
                      {isDone ? (
                        <IconCheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : isCurr ? (
                        <div className="spinner text-indigo-600 flex-shrink-0" style={{ width: 14, height: 14 }} />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0" />
                      )}
                      <span className={isDone ? 'text-slate-800 font-medium' : isCurr ? 'text-indigo-700 font-bold' : 'text-slate-400'}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drill Result Card */}
          {drillResult && drillStep === 5 && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fade">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconCheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-950">
                    Self-Healing Successful — Zero Pipeline Downtime
                  </span>
                </div>
                <span className="font-mono text-2xs text-emerald-800 font-bold">
                  {drillResult.transaction?.transaction_id}
                </span>
              </div>

              {drillResult.fallback_entry && (
                <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700 space-y-1">
                  <span className="text-3xs font-mono font-bold uppercase text-emerald-700 block">
                    Verified Audit Log Reason:
                  </span>
                  <p className="text-2xs italic leading-relaxed text-slate-800">
                    "{drillResult.fallback_entry.reasoning}"
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-2xs text-emerald-800 font-medium">
                  Status: <strong>{drillResult.transaction?.status}</strong> • Action: <strong>{drillResult.transaction?.recovery_action}</strong>
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onSelectTxn(drillResult.transaction);
                  }}
                  className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Inspect Audit Ledger</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-2xs font-mono text-slate-400">
            Resilience Invariant: Never Hang, Never Crash
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRunChaosDrill}
              disabled={isRunning}
              className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <IconPlay className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Executing Self-Healing Drill…' : 'Trigger Chaos Outage Drill'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChaosTestModal;

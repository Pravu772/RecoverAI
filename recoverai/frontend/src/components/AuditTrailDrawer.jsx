import { useEffect, useState } from 'react';
import { getAuditTrail } from '../api/index.js';

const ACTION_TYPE_CONFIG = {
  classification: { icon: '🔍', color: 'border-blue-500 bg-blue-500/20', label: 'Classification' },
  recovery_action: { icon: '⚡', color: 'border-teal-500 bg-teal-500/20', label: 'Recovery Action' },
  outcome: { icon: '✅', color: 'border-emerald-500 bg-emerald-500/20', label: 'Outcome' },
  exception: { icon: '🚨', color: 'border-rose-500 bg-rose-500/20', label: 'Exception' },
  constraint_blocked: { icon: '🛡️', color: 'border-amber-500 bg-amber-500/20', label: 'Blocked' },
};

const OUTCOME_COLORS = {
  success: 'text-emerald-400',
  failure: 'text-rose-400',
  pending: 'text-amber-400',
  skipped: 'text-slate-400',
  blocked: 'text-orange-400',
};

const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const formatINR = (amt) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

/**
 * AuditTrailDrawer — slide-out panel showing full chronological audit log for one transaction.
 */
const AuditTrailDrawer = ({ transaction, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!transaction) return;

    setLoading(true);
    setError(null);

    getAuditTrail(transaction.transaction_id)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [transaction?.transaction_id]);

  if (!transaction) return null;

  return (
    <>
      {/* Overlay */}
      <div className="drawer-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="drawer-panel p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Audit Trail</h2>
            <p className="text-xs font-mono text-primary-400 mt-1 break-all">
              {transaction.transaction_id}
            </p>
          </div>
          <button
            id="close-audit-drawer"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-lg hover:bg-surface-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction summary card */}
        <div className="glass-card p-4 space-y-2">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div>
              <span className="text-slate-500 text-xs">Amount</span>
              <p className="text-emerald-400 font-bold">{formatINR(transaction.amount)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Status</span>
              <p className={`badge badge-${transaction.status} mt-1 inline-flex`}>
                {transaction.status?.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Failure Code</span>
              <p className="font-mono text-xs text-slate-300 mt-0.5 bg-surface-600 px-2 py-0.5 rounded inline-block">
                {transaction.failure_code}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Classified As</span>
              <p className="text-slate-200 text-xs mt-0.5 capitalize">
                {transaction.classified_reason?.replace(/_/g, ' ') || '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Customer</span>
              <p className="text-slate-300 text-xs mt-0.5">{transaction.customer_id}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Attempts</span>
              <p className="text-slate-300 text-xs mt-0.5">{transaction.attempt_count}/3</p>
            </div>
          </div>
          {transaction.exception_reason && (
            <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <p className="text-xs text-rose-400">⚠️ {transaction.exception_reason}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Decision Timeline
          </h3>

          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 shimmer rounded-xl" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
              Failed to load audit trail: {error}
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-1">
              {data.audit_trail.length === 0 ? (
                <p className="text-slate-500 text-sm">No audit entries yet for this transaction.</p>
              ) : (
                data.audit_trail.map((entry, idx) => {
                  const config = ACTION_TYPE_CONFIG[entry.action_type] || ACTION_TYPE_CONFIG.classification;
                  return (
                    <div key={entry._id || idx} className="timeline-item pb-4">
                      {/* Dot */}
                      <div className={`timeline-dot ${config.color}`}>
                        <span className="text-[8px]">{idx + 1}</span>
                      </div>

                      {/* Content card */}
                      <div className="glass-card p-3 hover:border-white/10 transition-colors">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{config.icon}</span>
                            <span className="text-xs font-semibold text-slate-300">{config.label}</span>
                            {entry.action_taken && entry.action_taken !== 'none' && (
                              <span className="text-xs text-slate-500 font-mono bg-surface-600 px-1.5 py-0.5 rounded">
                                {entry.action_taken}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs font-semibold ${OUTCOME_COLORS[entry.outcome] || 'text-slate-400'}`}>
                            {entry.outcome}
                          </span>
                        </div>

                        {/* Reasoning text */}
                        <p className="text-xs text-slate-400 leading-relaxed">{entry.reasoning}</p>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-2">
                          {entry.confidence_score !== null && entry.confidence_score !== undefined && (
                            <span className="text-xs text-slate-600">
                              Confidence: <span className="text-slate-400">{Math.round(entry.confidence_score * 100)}%</span>
                            </span>
                          )}
                          <span className="text-xs text-slate-600 ml-auto">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditTrailDrawer;

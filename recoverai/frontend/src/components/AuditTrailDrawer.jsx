import { useEffect, useState } from 'react';
import { getAuditTrail } from '../api/index.js';
import { IconX, IconCheckCircle, IconAlertTriangle, IconZap, IconShield, IconActivity } from './Icons.jsx';

const EVENT_CONFIG = {
  classification:    { Icon: IconActivity, label: 'Classification',   dotColor: '#1d4ed8' },
  recovery_action:   { Icon: IconZap,      label: 'Recovery Action',  dotColor: '#0891b2' },
  outcome:           { Icon: IconCheckCircle, label: 'Outcome',       dotColor: '#059669' },
  exception:         { Icon: IconAlertTriangle, label: 'Exception',   dotColor: '#d97706' },
  constraint_blocked:{ Icon: IconShield,   label: 'Blocked',          dotColor: '#64748b' },
};

const OUTCOME_STYLE = {
  success: { color: '#059669', bg: '#ecfdf5' },
  failure: { color: '#dc2626', bg: '#fef2f2' },
  pending: { color: '#d97706', bg: '#fffbeb' },
  skipped: { color: '#64748b', bg: '#f8fafc' },
  blocked: { color: '#64748b', bg: '#f8fafc' },
};

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const STATUS_META = {
  failed:              'badge-failed',
  recovered:           'badge-recovered',
  exception:           'badge-exception',
  action_taken:        'badge-action_taken',
  max_retries_reached: 'badge-max_retries_reached',
  pending_human:       'badge-pending_human',
  opted_out:           'badge-opted_out',
  classifying:         'badge-classifying',
};

const AuditTrailDrawer = ({ transaction, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!transaction) return;
    setLoading(true); setError(null); setData(null);
    getAuditTrail(transaction.transaction_id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [transaction?.transaction_id]);

  if (!transaction) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">

        {/* Header */}
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between gap-4 z-10"
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo-icon.png" alt="RecoverAI" className="w-7 h-7 object-contain rounded-md" />
            <div className="min-w-0">
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Immutable Audit Trail
              </p>
              <p className="font-mono text-xs truncate" style={{ color: 'var(--color-accent)' }}>
                {transaction.transaction_id}
              </p>
            </div>
          </div>
          <button
            id="close-audit-drawer"
            onClick={onClose}
            className="btn-ghost w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-md"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction summary */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { label: 'Amount', value: formatINR(transaction.amount), mono: false, bold: true },
              {
                label: 'Status',
                value: null,
                node: <span className={`badge ${STATUS_META[transaction.status] || ''} mt-0.5`}>
                  {transaction.status?.replace(/_/g, ' ')}
                </span>,
              },
              {
                label: 'Failure Code',
                value: null,
                node: <span className="code-chip mt-0.5">{transaction.failure_code}</span>,
              },
              {
                label: 'Classified As',
                value: transaction.classified_reason?.replace(/_/g, ' ') || '—',
                capitalize: true,
              },
              { label: 'Customer', value: transaction.customer_id },
              { label: 'Attempts',  value: `${transaction.attempt_count} / 3` },
            ].map((row, i) => (
              <div key={i}>
                <p className="text-2xs font-medium uppercase tracking-wide mb-0.5"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {row.label}
                </p>
                {row.node || (
                  <p className={`text-sm ${row.bold ? 'font-semibold' : ''} ${row.capitalize ? 'capitalize' : ''}`}
                    style={{ color: 'var(--color-text-primary)' }}>
                    {row.value}
                  </p>
                )}
              </div>
            ))}
          </div>

          {transaction.exception_reason && (
            <div className="mt-3 px-3 py-2 rounded-md text-xs"
              style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
              {transaction.exception_reason}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="px-5 py-5">
          <p className="text-2xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: 'var(--color-text-muted)' }}>
            Decision Timeline
          </p>

          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {error && (
            <div className="px-3 py-3 rounded-lg text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              Failed to load audit trail: {error}
            </div>
          )}

          {!loading && !error && data && (
            <div className="timeline">
              {data.audit_trail.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No entries yet for this transaction.
                </p>
              ) : (
                data.audit_trail.map((entry, idx) => {
                  const cfg = EVENT_CONFIG[entry.action_type] || EVENT_CONFIG.classification;
                  const outStyle = OUTCOME_STYLE[entry.outcome] || OUTCOME_STYLE.pending;
                  const { Icon } = cfg;

                  return (
                    <div key={entry._id || idx} className="timeline-item">
                      {/* Dot */}
                      <div
                        className="timeline-dot"
                        style={{ borderColor: cfg.dotColor, background: 'var(--color-surface)' }}
                      />

                      {/* Card */}
                      <div className="card p-3 card-hover">
                        {/* Top row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.dotColor }} />
                            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {cfg.label}
                            </span>
                            {entry.action_taken && entry.action_taken !== 'none' && (
                              <span className="code-chip">{entry.action_taken}</span>
                            )}
                          </div>
                          <span
                            className="text-2xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: outStyle.bg, color: outStyle.color }}
                          >
                            {entry.outcome}
                          </span>
                        </div>

                        {/* Reasoning */}
                        <p className="text-xs leading-relaxed"
                          style={{ color: 'var(--color-text-secondary)' }}>
                          {entry.reasoning}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center gap-3 mt-2.5 pt-2"
                          style={{ borderTop: '1px solid var(--color-border)' }}>
                          {entry.confidence_score !== null && entry.confidence_score !== undefined && (
                            <span className="text-2xs" style={{ color: 'var(--color-text-muted)' }}>
                              Confidence:{' '}
                              <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                                {Math.round(entry.confidence_score * 100)}%
                              </span>
                            </span>
                          )}
                          <span className="ml-auto text-2xs" style={{ color: 'var(--color-text-muted)' }}>
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

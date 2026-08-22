import { IconAlertTriangle, IconXCircle, IconUser, IconShield, IconChevronRight, reasonIcon } from './Icons.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

const EXCEPTION_META = {
  exception:           { Icon: IconAlertTriangle, label: 'Low AI Confidence', dotColor: '#d97706', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  max_retries_reached: { Icon: IconXCircle,       label: 'Max Retries Reached', dotColor: '#dc2626', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  pending_human:       { Icon: IconUser,           label: 'Pending Human Review', dotColor: '#c2410c', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  opted_out:           { Icon: IconShield,         label: 'Customer Opted Out', dotColor: '#64748b', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const ExceptionsPanel = ({ transactions, onRowClick }) => {
  const { formatMoney } = useCurrency();
  const exceptions = (transactions || []).filter(t =>
    ['exception', 'max_retries_reached', 'pending_human', 'opted_out'].includes(t.status)
  );

  // Group counts
  const counts = exceptions.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  if (exceptions.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-center shadow-2xs">
          <img src="/logo-icon.png" alt="RecoverAI" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-bold text-sm text-slate-900 mb-1">
            Zero Active Exceptions
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            All failure signatures are within automated confidence bounds. Run a recovery batch or inject a failure scenario to test human escalation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <IconAlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Human-in-the-Loop Escalation Queue
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(counts).map(([status, count]) => {
            const meta = EXCEPTION_META[status];
            if (!meta) return null;
            return (
              <span
                key={status}
                className={`text-2xs px-2.5 py-0.5 rounded-full font-semibold border ${meta.bg}`}
              >
                {meta.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Exception Items List */}
      <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
        {exceptions.map(txn => {
          const meta = EXCEPTION_META[txn.status] || EXCEPTION_META.exception;
          const { Icon } = meta;
          const ReasonIcon = reasonIcon(txn.classified_reason);

          return (
            <div
              key={txn.transaction_id || txn._id}
              onClick={() => onRowClick && onRowClick(txn)}
              className="p-4 hover:bg-slate-50/90 transition-all cursor-pointer group flex items-start gap-4"
            >
              {/* Status Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: meta.dotColor + '14', color: meta.dotColor }}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {txn.customer_name || 'Account'}
                    </span>
                    <span className="font-mono text-2xs text-slate-400">
                      ({(txn.transaction_id || '').substring(0, 14)}…)
                    </span>
                  </div>
                  <span className="font-bold font-mono text-xs text-slate-900 tabular-nums">
                    {formatMoney(txn.amount)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${meta.bg}`}>
                    {meta.label}
                  </span>
                  <span className="font-mono text-2xs px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600">
                    {txn.failure_code}
                  </span>
                  {txn.classified_reason && (
                    <div className="flex items-center gap-1 text-2xs text-slate-500 capitalize">
                      <ReasonIcon className="w-3 h-3 text-slate-400" />
                      <span>{txn.classified_reason.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>

                <p className="text-2xs text-slate-600 leading-relaxed">
                  {txn.exception_reason ||
                    (txn.status === 'pending_human' && 'AI confidence below policy guardrail threshold (0.60) — Requires manual approval.') ||
                    (txn.status === 'opted_out'    && `Customer ${txn.customer_id} has opted out of automated recovery touches.`) ||
                    (txn.status === 'max_retries_reached' && `Maximum attempts (${txn.attempt_count}) reached without confirmation. Blocked by stopping rule.`)
                  }
                </p>
              </div>

              <IconChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExceptionsPanel;

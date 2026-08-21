const EXCEPTION_REASONS = {
  exception: { icon: '🤔', label: 'Low AI Confidence', color: 'border-amber-500/30 bg-amber-500/5' },
  max_retries_reached: { icon: '🔚', label: 'Max Retries Hit', color: 'border-rose-500/30 bg-rose-500/5' },
  pending_human: { icon: '👤', label: 'Needs Human', color: 'border-orange-500/30 bg-orange-500/5' },
  opted_out: { icon: '🚫', label: 'Opted Out', color: 'border-slate-500/30 bg-slate-500/5' },
};

const formatINR = (amt) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

/**
 * ExceptionsPanel — lists all transactions that couldn't be auto-resolved.
 * Shows WHY each one failed — proving the system is honest about its limits.
 */
const ExceptionsPanel = ({ transactions, onRowClick }) => {
  const exceptions = transactions.filter(t =>
    ['exception', 'max_retries_reached', 'pending_human', 'opted_out'].includes(t.status)
  );

  if (exceptions.length === 0) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">
          ✨
        </div>
        <p className="text-slate-300 font-medium">No Exceptions</p>
        <p className="text-sm text-slate-500 max-w-xs">
          All transactions have been handled — either recovered or assigned a recovery action.
          Generate a batch to see exceptions here.
        </p>
      </div>
    );
  }

  // Group by exception type
  const grouped = {};
  for (const txn of exceptions) {
    if (!grouped[txn.status]) grouped[txn.status] = [];
    grouped[txn.status].push(txn);
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <h3 className="section-header">Exceptions — Human Review Required</h3>
        </div>
        <span className="badge badge-exception">{exceptions.length} total</span>
      </div>

      {/* Summary stat bars */}
      <div className="px-4 py-3 flex flex-wrap gap-3 border-b border-white/5">
        {Object.entries(grouped).map(([status, items]) => {
          const conf = EXCEPTION_REASONS[status] || { icon: '❓', label: status, color: '' };
          return (
            <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${conf.color}`}>
              <span className="text-sm">{conf.icon}</span>
              <span className="text-xs font-medium text-slate-300">{conf.label}</span>
              <span className="text-xs text-slate-500">({items.length})</span>
            </div>
          );
        })}
      </div>

      {/* Exception list */}
      <div className="divide-y divide-white/[0.03] max-h-96 overflow-y-auto">
        {exceptions.map(txn => {
          const conf = EXCEPTION_REASONS[txn.status] || { icon: '❓', label: txn.status, color: 'border-slate-500/30' };

          return (
            <div
              key={txn.transaction_id || txn._id}
              onClick={() => onRowClick(txn)}
              className="p-4 hover:bg-surface-700/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border ${conf.color}`}>
                  {conf.icon}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-primary-400 group-hover:text-primary-300 truncate">
                      {txn.transaction_id}
                    </span>
                    <span className="text-sm font-bold text-slate-200 whitespace-nowrap">
                      {formatINR(txn.amount)}
                    </span>
                  </div>

                  {/* Reason tag + failure code */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`badge badge-${txn.status} text-xs`}>{conf.label}</span>
                    <span className="font-mono text-xs bg-surface-600 text-slate-400 px-1.5 py-0.5 rounded">
                      {txn.failure_code}
                    </span>
                    {txn.attempt_count >= 3 && (
                      <span className="text-xs text-rose-400">⚠ 3/3 attempts used</span>
                    )}
                    {txn.opted_out && (
                      <span className="text-xs text-slate-400">Customer opted out</span>
                    )}
                  </div>

                  {/* Exception reason — the "why" */}
                  {txn.exception_reason && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {txn.exception_reason}
                    </p>
                  )}

                  {txn.status === 'pending_human' && (
                    <p className="text-xs text-orange-400/80 leading-relaxed">
                      Mandate expired or unknown classification — requires manual re-authorization
                    </p>
                  )}

                  {txn.status === 'opted_out' && (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Customer {txn.customer_id} has opted out of all recovery communications
                    </p>
                  )}
                </div>

                {/* Click hint */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExceptionsPanel;

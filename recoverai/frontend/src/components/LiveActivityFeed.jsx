import { useState, useEffect } from 'react';
import { IconActivity, IconZap, IconCheckCircle, IconAlertTriangle, IconRepeat, IconShield } from './Icons.jsx';

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const LiveActivityFeed = ({ transactions, onSelectTxn }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterType, setFilterType] = useState('all');

  // Derive recent activity events from transaction updates
  const recentEvents = transactions
    .filter(t => t.status !== 'failed')
    .slice(0, 15);

  return (
    <div className="card overflow-hidden bg-white border border-slate-200 shadow-xs mb-6">
      {/* Feed Header */}
      <div className="px-5 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Live Pipeline Stream
            </h3>
          </div>
          <span className="text-2xs font-mono text-slate-500 bg-slate-200/70 px-2 py-0.2 rounded-full">
            {recentEvents.length} Recent Events
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-2xs">
            {['all', 'recovered', 'actions'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2 py-0.5 rounded font-semibold capitalize transition-all ${
                  filterType === f ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-2xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand Stream'}
          </button>
        </div>
      </div>

      {/* Events List */}
      {isExpanded && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto bg-slate-50/40">
          {recentEvents.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-slate-400">
              Pipeline waiting for initial transaction batch — click "Run Full Recovery Cycle"
            </div>
          ) : (
            recentEvents
              .filter(t => {
                if (filterType === 'recovered') return t.status === 'recovered';
                if (filterType === 'actions') return t.status === 'action_taken';
                return true;
              })
              .map((t, idx) => {
                const isRecovered = t.status === 'recovered';
                const isException = t.status === 'exception' || t.status === 'max_retries_reached';

                return (
                  <div
                    key={t.transaction_id || idx}
                    onClick={() => onSelectTxn(t)}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer flex items-start gap-2.5 group"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isRecovered ? 'bg-emerald-50 text-emerald-600' :
                      isException ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {isRecovered ? <IconCheckCircle className="w-3.5 h-3.5" /> :
                       isException ? <IconAlertTriangle className="w-3.5 h-3.5" /> :
                       <IconZap className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {t.customer_name || 'Account'}
                        </span>
                        <span className="text-2xs font-mono font-bold text-slate-900 tabular-nums">
                          {formatINR(t.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-2xs text-slate-500 capitalize truncate">
                          {t.recovery_action ? t.recovery_action.replace(/_/g, ' ') : t.status}
                        </span>
                        <span className="text-2xs text-slate-300">•</span>
                        <span className={`text-2xs font-semibold ${
                          isRecovered ? 'text-emerald-700' : isException ? 'text-rose-700' : 'text-blue-700'
                        }`}>
                          {isRecovered ? 'Recovered' : isException ? 'Exception' : 'Dispatched'}
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
  );
};

export default LiveActivityFeed;

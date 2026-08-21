import { useState, useMemo } from 'react';

const STATUS_LABELS = {
  failed: 'Failed',
  classifying: 'Classifying',
  action_taken: 'Action Taken',
  recovered: 'Recovered',
  exception: 'Exception',
  max_retries_reached: 'Max Retries',
  pending_human: 'Pending Human',
  opted_out: 'Opted Out',
};

const REASON_COLORS = {
  insufficient_funds: 'text-amber-400',
  card_expired: 'text-orange-400',
  bank_timeout: 'text-blue-400',
  mandate_expired: 'text-violet-400',
  network_error: 'text-cyan-400',
  unknown: 'text-slate-400',
};

const ACTION_ICONS = {
  immediate_retry: '🔄',
  scheduled_retry_2days: '⏳',
  sms_nudge: '📱',
  email_alt_payment: '📧',
  escalate_human: '👤',
  none: '—',
};

const formatINR = (amt) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

const ConfidenceBadge = ({ score }) => {
  if (score === null || score === undefined) return <span className="text-slate-600">—</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'text-emerald-400' : score >= 0.6 ? 'text-amber-400' : 'text-rose-400';
  return (
    <span className={`font-mono text-xs ${color}`}>
      {pct}%
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const cls = `badge-${status}` in {} ? `badge badge-${status}` : 'badge bg-slate-700 text-slate-400';
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

/**
 * TransactionTable — sortable, filterable table of all transactions.
 * Clicking a row opens the audit trail drawer.
 */
const TransactionTable = ({ transactions, onRowClick, isLoading }) => {
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [searchText, setSearchText] = useState('');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="opacity-20 ml-1">↕</span>;
    return <span className="text-primary-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (filterStatus && t.status !== filterStatus) return false;
        if (filterReason && t.classified_reason !== filterReason) return false;
        if (searchText) {
          const q = searchText.toLowerCase();
          return (
            t.transaction_id?.toLowerCase().includes(q) ||
            t.customer_id?.toLowerCase().includes(q) ||
            t.merchant_id?.toLowerCase().includes(q) ||
            t.failure_code?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let av = a[sortField], bv = b[sortField];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [transactions, filterStatus, filterReason, searchText, sortField, sortDir]);

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 shimmer rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Filters bar */}
      <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 items-center">
        <input
          id="txn-search"
          type="text"
          placeholder="Search by ID, customer, merchant…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="input-field flex-1 min-w-[180px]"
        />
        <select
          id="filter-status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-field"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          id="filter-reason"
          value={filterReason}
          onChange={e => setFilterReason(e.target.value)}
          className="input-field"
        >
          <option value="">All Reasons</option>
          {['insufficient_funds','card_expired','bank_timeout','mandate_expired','network_error','unknown'].map(r => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} of {transactions.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left">
              {[
                { field: 'transaction_id', label: 'Transaction ID' },
                { field: 'amount', label: 'Amount' },
                { field: 'failure_code', label: 'Failure Code' },
                { field: 'classified_reason', label: 'Classified Reason' },
                { field: 'confidence_score', label: 'Confidence' },
                { field: 'recovery_action', label: 'Action' },
                { field: 'status', label: 'Status' },
                { field: 'attempt_count', label: 'Attempts' },
              ].map(col => (
                <th
                  key={col.field}
                  onClick={() => handleSort(col.field)}
                  className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                >
                  {col.label}<SortIcon field={col.field} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  {transactions.length === 0
                    ? 'No transactions yet — click "Generate Batch" to start'
                    : 'No transactions match the current filters'}
                </td>
              </tr>
            ) : (
              filtered.map(txn => (
                <tr
                  key={txn.transaction_id || txn._id}
                  onClick={() => onRowClick(txn)}
                  className="table-row-hover group"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-primary-400 group-hover:text-primary-300">
                      {txn.transaction_id?.substring(0, 16)}…
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200 whitespace-nowrap">
                    {formatINR(txn.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-surface-600 text-slate-300 px-2 py-0.5 rounded">
                      {txn.failure_code}
                    </span>
                    {txn.opted_out && (
                      <span className="ml-1 text-xs text-slate-500" title="Customer opted out">🚫</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {txn.classified_reason ? (
                      <span className={`text-xs font-medium ${REASON_COLORS[txn.classified_reason] || 'text-slate-400'}`}>
                        {txn.classified_reason.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge score={txn.confidence_score} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-300">
                    {txn.recovery_action ? (
                      <span>
                        {ACTION_ICONS[txn.recovery_action] || ''}{' '}
                        {txn.recovery_action.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-mono ${txn.attempt_count >= 3 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {txn.attempt_count}/3
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;

import { useState, useMemo } from 'react';
import {
  IconSearch, IconFilter, IconChevronUp, IconChevronDown,
  IconChevronRight, actionIcon, reasonIcon, IconCopy, IconCheck,
  IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCalendar
} from './Icons.jsx';

const STATUS_META = {
  failed:              { label: 'Failed',            cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  classifying:         { label: 'Classifying',       cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  action_taken:        { label: 'Action Dispatched',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  recovered:           { label: 'Recovered',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  exception:           { label: 'Exception Flagged',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  max_retries_reached: { label: 'Max Attempts Stop',  cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  pending_human:       { label: 'Manual Review',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  opted_out:           { label: 'Opted Out',         cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  ptp_committed:       { label: 'PTP Committed',      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ptp_broken:          { label: 'PTP Broken',         cls: 'bg-rose-100 text-rose-800 border-rose-300' },
};

const STREAM_META = {
  payment_gateway:      { label: 'Gateway Failure',     Icon: IconZap,          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  checkout_abandonment: { label: 'Cart Abandonment',    Icon: IconShoppingCart, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  subscription_renewal: { label: 'Recurring Mandate',   Icon: IconRepeat,        color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  b2b_invoice:          { label: 'B2B Receivable',      Icon: IconFileText,      color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
};

const REASON_COLORS = {
  insufficient_funds:          '#d97706',
  card_expired:                '#ea580c',
  bank_timeout:                '#2563eb',
  mandate_expired:             '#7c3aed',
  network_error:               '#0891b2',
  checkout_hesitation:         '#ea580c',
  otp_dropoff:                 '#e11d48',
  invoice_overdue_30d:         '#0d9488',
  invoice_overdue_60d:         '#b91c1c',
  subscription_failed_billing: '#6d28d9',
  unknown:                     '#64748b',
};

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ConfidenceBar = ({ score }) => {
  if (score === null || score === undefined) return <span className="text-slate-400 font-mono text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? '#059669' : score >= 0.6 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-2xs font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
};

const SortIcon = ({ field, active, dir }) => {
  if (!active) return <IconChevronDown className="w-3 h-3 opacity-25 inline ml-0.5" />;
  return dir === 'asc'
    ? <IconChevronUp className="w-3 h-3 inline ml-0.5 text-indigo-600" />
    : <IconChevronDown className="w-3 h-3 inline ml-0.5 text-indigo-600" />;
};

const COLUMNS = [
  { field: 'revenue_stream',    label: 'Stream' },
  { field: 'customer_name',     label: 'Customer / Account' },
  { field: 'amount',            label: 'At Risk' },
  { field: 'classified_reason', label: 'Diagnosis' },
  { field: 'confidence_score',  label: 'AI Conf.' },
  { field: 'recovery_action',   label: 'Selected Action' },
  { field: 'status',            label: 'Status & PTP' },
  { field: 'attempt_count',     label: 'Attempts' },
];

const TransactionTable = ({ transactions, onRowClick, isLoading, selectedStream }) => {
  const [sortField, setSortField] = useState('created_at');
  const [sortDir,   setSortDir]   = useState('desc');
  const [fStatus,   setFStatus]   = useState('');
  const [fReason,   setFReason]   = useState('');
  const [search,    setSearch]    = useState('');
  const [copiedId,  setCopiedId]  = useState(null);

  const handleCopy = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const rows = useMemo(() => {
    return transactions
      .filter(t => {
        if (selectedStream && selectedStream !== 'all') {
          if (selectedStream === 'ptp' && !['committed', 'kept', 'broken'].includes(t.ptp_status)) return false;
          if (selectedStream !== 'ptp' && t.revenue_stream !== selectedStream) return false;
        }
        if (fStatus && t.status !== fStatus) return false;
        if (fReason && t.classified_reason !== fReason) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            t.transaction_id?.toLowerCase().includes(q) ||
            t.customer_name?.toLowerCase().includes(q) ||
            t.customer_id?.toLowerCase().includes(q) ||
            t.failure_code?.toLowerCase().includes(q) ||
            t.merchant_id?.toLowerCase().includes(q) ||
            t.cart_summary?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let av = a[sortField] ?? '', bv = b[sortField] ?? '';
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });
  }, [transactions, selectedStream, fStatus, fReason, search, sortField, sortDir]);

  if (isLoading) {
    return (
      <div className="card overflow-hidden bg-white border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="skeleton h-8 w-64" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-4 py-3.5 border-b border-slate-100">
            <div className="skeleton h-5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden bg-white border border-slate-200 shadow-xs">
      {/* Table Toolbar */}
      <div className="px-4 py-3 flex flex-wrap gap-2.5 items-center bg-slate-50/70 border-b border-slate-200">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <IconSearch className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          <input
            id="txn-search"
            className="input pl-8 text-xs bg-white"
            placeholder="Search account, ID, or item…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          id="filter-status"
          className="input w-auto text-xs bg-white"
          value={fStatus}
          onChange={e => setFStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          id="filter-reason"
          className="input w-auto text-xs bg-white"
          value={fReason}
          onChange={e => setFReason(e.target.value)}
        >
          <option value="">All Diagnoses</option>
          {Object.keys(REASON_COLORS).map(r => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <div className="ml-auto text-2xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800 font-mono">{rows.length}</strong> of {transactions.length} entries
        </div>
      </div>

      {/* Structured Ledger Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.field} onClick={() => handleSort(col.field)}>
                  {col.label}
                  <SortIcon field={col.field} active={sortField === col.field} dir={sortDir} />
                </th>
              ))}
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-slate-400 text-xs">
                  {transactions.length === 0
                    ? 'No ledger items available — click "Run Full Demo" to initialize data.'
                    : 'No records matching the active filter criteria.'}
                </td>
              </tr>
            ) : rows.map(txn => {
              const sm = STATUS_META[txn.status] || { label: txn.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
              const st = STREAM_META[txn.revenue_stream] || STREAM_META.payment_gateway;
              const StreamIcon = st.Icon;
              const ActionIcon = actionIcon(txn.recovery_action);
              const ReasonIcon = reasonIcon(txn.classified_reason);
              const reasonColor = REASON_COLORS[txn.classified_reason] || '#64748b';

              return (
                <tr
                  key={txn.transaction_id || txn._id}
                  onClick={() => onRowClick(txn)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Stream */}
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 text-2xs font-semibold px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}
                    >
                      <StreamIcon className="w-3 h-3" />
                      <span>{st.label}</span>
                    </span>
                  </td>

                  {/* Customer / Account */}
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-slate-900 leading-tight">
                        {txn.customer_name || 'Customer'}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-2xs text-slate-400">
                          {(txn.transaction_id || '').substring(0, 12)}…
                        </span>
                        <button
                          onClick={(e) => handleCopy(e, txn.transaction_id)}
                          className="p-0.5 rounded text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy Transaction ID"
                        >
                          {copiedId === txn.transaction_id ? (
                            <IconCheck className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <IconCopy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {txn.cart_summary && (
                        <span className="text-2xs text-slate-500 truncate max-w-[150px] mt-0.5" title={txn.cart_summary}>
                          {txn.cart_summary}
                        </span>
                      )}
                      {txn.invoice_id && (
                        <span className="text-2xs text-teal-700 font-mono font-medium mt-0.5">
                          {txn.invoice_id} ({txn.invoice_aging_days}d overdue)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* At Risk Amount */}
                  <td>
                    <span className="font-bold font-mono text-xs text-slate-900 tabular-nums">
                      {formatINR(txn.amount)}
                    </span>
                  </td>

                  {/* Diagnosis */}
                  <td>
                    {txn.classified_reason ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <ReasonIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: reasonColor }} />
                          <span className="text-xs font-semibold capitalize" style={{ color: reasonColor }}>
                            {txn.classified_reason.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-2xs font-mono text-slate-400 mt-0.5">{txn.failure_code}</span>
                      </div>
                    ) : (
                      <span className="code-chip text-2xs">{txn.failure_code}</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td><ConfidenceBar score={txn.confidence_score} /></td>

                  {/* Selected Action */}
                  <td>
                    {txn.recovery_action && txn.recovery_action !== 'none' ? (
                      <div className="flex items-center gap-1.5">
                        <ActionIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-700 capitalize">
                          {txn.recovery_action.replace(/_/g, ' ')}
                        </span>
                        {txn.recovery_action === 'hinglish_voice_call' && (
                          <span className="text-2xs px-1.5 py-0.2 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Voice AI
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>

                  {/* Status & PTP */}
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${sm.cls}`}>
                        {sm.label}
                      </span>
                      {txn.ptp_status === 'committed' && (
                        <span className="text-2xs font-medium text-indigo-700 bg-indigo-50/70 border border-indigo-200 px-1.5 py-0.2 rounded font-mono">
                          Due {new Date(txn.ptp_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Attempts */}
                  <td>
                    <span
                      className="font-mono text-2xs font-semibold"
                      style={{ color: txn.attempt_count >= 3 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}
                    >
                      {txn.attempt_count}/3
                    </span>
                  </td>

                  {/* Row chevron */}
                  <td>
                    <IconChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;



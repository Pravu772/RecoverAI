import { useState, useMemo } from 'react';
import {
  IconSearch, IconFilter, IconChevronUp, IconChevronDown,
  IconChevronRight, actionIcon, reasonIcon,
} from './Icons.jsx';

const STATUS_META = {
  failed:              { label: 'Failed',        cls: 'badge-failed' },
  classifying:         { label: 'Classifying',   cls: 'badge-classifying' },
  action_taken:        { label: 'Action Taken',  cls: 'badge-action_taken' },
  recovered:           { label: 'Recovered',     cls: 'badge-recovered' },
  exception:           { label: 'Exception',     cls: 'badge-exception' },
  max_retries_reached: { label: 'Max Retries',   cls: 'badge-max_retries_reached' },
  pending_human:       { label: 'Pending Review',cls: 'badge-pending_human' },
  opted_out:           { label: 'Opted Out',     cls: 'badge-opted_out' },
  ptp_committed:       { label: '🤝 PTP Committed', cls: 'badge-action_taken' },
  ptp_broken:          { label: '⚠️ PTP Broken', cls: 'badge-exception' },
};

const STREAM_META = {
  payment_gateway:      { label: 'Gateway Fail', icon: '⚡', color: '#1d4ed8', bg: '#eff6ff' },
  checkout_abandonment: { label: 'Cart Drop',    icon: '🛒', color: '#ea580c', bg: '#fff7ed' },
  subscription_renewal: { label: 'Subscription', icon: '🔄', color: '#7c3aed', bg: '#f5f3ff' },
  b2b_invoice:          { label: 'B2B Invoice',  icon: '🏢', color: '#0d9488', bg: '#f0fdfa' },
};

const REASON_COLORS = {
  insufficient_funds:          '#d97706',
  card_expired:                '#c2410c',
  bank_timeout:                '#1d4ed8',
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
  if (score === null || score === undefined) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? '#059669' : score >= 0.6 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="progress-track w-10">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{pct}%</span>
    </div>
  );
};

const SortIcon = ({ field, active, dir }) => {
  if (!active) return <IconChevronDown className="w-3 h-3 opacity-25 inline ml-0.5" />;
  return dir === 'asc'
    ? <IconChevronUp className="w-3 h-3 inline ml-0.5" style={{ color: 'var(--color-accent)' }} />
    : <IconChevronDown className="w-3 h-3 inline ml-0.5" style={{ color: 'var(--color-accent)' }} />;
};

const COLUMNS = [
  { field: 'revenue_stream',    label: 'Stream' },
  { field: 'transaction_id',    label: 'Customer / ID' },
  { field: 'amount',            label: 'Amount' },
  { field: 'classified_reason', label: 'Diagnosis & Reason' },
  { field: 'confidence_score',  label: 'Confidence' },
  { field: 'recovery_action',   label: 'Recovery Intervention' },
  { field: 'status',            label: 'Status & PTP' },
  { field: 'attempt_count',     label: 'Attempts' },
];

const TransactionTable = ({ transactions, onRowClick, isLoading, selectedStream }) => {
  const [sortField, setSortField] = useState('created_at');
  const [sortDir,   setSortDir]   = useState('desc');
  const [fStatus,   setFStatus]   = useState('');
  const [fReason,   setFReason]   = useState('');
  const [search,    setSearch]    = useState('');

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
      <div className="card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="skeleton h-8 w-64" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="skeleton h-5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div
        className="px-4 py-3 flex flex-wrap gap-2 items-center"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <input
            id="txn-search"
            className="input pl-7"
            placeholder="Search by customer, ID, or item…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select id="filter-status" className="input w-auto" value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select id="filter-reason" className="input w-auto" value={fReason} onChange={e => setFReason(e.target.value)}>
          <option value="">All Reasons</option>
          {Object.keys(REASON_COLORS).map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>

        <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Showing <strong>{rows.length}</strong> of {transactions.length} records
        </span>
      </div>

      {/* Table */}
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
              <th style={{ width: 40 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  {transactions.length === 0
                    ? 'No revenue items yet — click "Generate Batch" to run the demo'
                    : 'No items match the selected stream / filter'}
                </td>
              </tr>
            ) : rows.map(txn => {
              const sm = STATUS_META[txn.status] || { label: txn.status, cls: '' };
              const st = STREAM_META[txn.revenue_stream] || STREAM_META.payment_gateway;
              const ActionIcon = actionIcon(txn.recovery_action);
              const ReasonIcon = reasonIcon(txn.classified_reason);
              const reasonColor = REASON_COLORS[txn.classified_reason] || 'var(--color-text-muted)';

              return (
                <tr key={txn.transaction_id || txn._id} onClick={() => onRowClick(txn)} className="cursor-pointer hover:bg-slate-50">
                  {/* Stream */}
                  <td>
                    <span
                      className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}22` }}
                    >
                      <span>{st.icon}</span>
                      <span>{st.label}</span>
                    </span>
                  </td>

                  {/* Customer / Transaction ID */}
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-slate-800">
                        {txn.customer_name || 'Customer'}
                      </span>
                      <span className="font-mono text-2xs text-slate-400">
                        {(txn.transaction_id || '').substring(0, 14)}
                      </span>
                      {txn.cart_summary && (
                        <span className="text-2xs text-slate-500 truncate max-w-[140px]" title={txn.cart_summary}>
                          🛒 {txn.cart_summary}
                        </span>
                      )}
                      {txn.invoice_id && (
                        <span className="text-2xs text-teal-700 font-mono">
                          📄 {txn.invoice_id} ({txn.invoice_aging_days}d)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Amount */}
                  <td>
                    <span className="font-bold tabular-nums text-slate-900">
                      {formatINR(txn.amount)}
                    </span>
                  </td>

                  {/* Diagnosis & Reason */}
                  <td>
                    {txn.classified_reason ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <ReasonIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: reasonColor }} />
                          <span className="text-xs font-medium capitalize" style={{ color: reasonColor }}>
                            {txn.classified_reason.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-2xs font-mono text-slate-400">{txn.failure_code}</span>
                      </div>
                    ) : (
                      <span className="code-chip">{txn.failure_code}</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td><ConfidenceBar score={txn.confidence_score} /></td>

                  {/* Recovery Intervention */}
                  <td>
                    {txn.recovery_action && txn.recovery_action !== 'none' ? (
                      <div className="flex items-center gap-1.5">
                        <ActionIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
                        <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
                          {txn.recovery_action.replace(/_/g, ' ')}
                        </span>
                        {txn.recovery_action === 'hinglish_voice_call' && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">
                            🎙️ Voice
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Status & PTP */}
                  <td>
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`badge ${sm.cls}`}>{sm.label}</span>
                      {txn.ptp_status === 'committed' && (
                        <span className="text-2xs font-medium px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                          Due: {new Date(txn.ptp_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Attempts */}
                  <td>
                    <span
                      className="font-mono text-xs"
                      style={{ color: txn.attempt_count >= 3 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
                    >
                      {txn.attempt_count}/3
                    </span>
                  </td>

                  {/* Action Icon */}
                  <td>
                    <button
                      className="p-1 rounded hover:bg-slate-200 text-slate-500"
                      title="Open Audit Trail & Voice AI"
                    >
                      <IconChevronRight className="w-4 h-4" />
                    </button>
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


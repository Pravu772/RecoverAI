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
};

const REASON_COLORS = {
  insufficient_funds: '#d97706',
  card_expired:       '#c2410c',
  bank_timeout:       '#1d4ed8',
  mandate_expired:    '#7c3aed',
  network_error:      '#0891b2',
  unknown:            '#64748b',
};

const REASONS = ['insufficient_funds','card_expired','bank_timeout','mandate_expired','network_error','unknown'];

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ConfidenceBar = ({ score }) => {
  if (score === null || score === undefined) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? '#059669' : score >= 0.6 ? '#d97706' : '#dc2626';
  return (
    <div className="flex items-center gap-2">
      <div className="progress-track w-12">
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
  { field: 'transaction_id', label: 'Transaction ID' },
  { field: 'amount',         label: 'Amount' },
  { field: 'failure_code',   label: 'Failure Code' },
  { field: 'classified_reason', label: 'Classified Reason' },
  { field: 'confidence_score',  label: 'Confidence' },
  { field: 'recovery_action',   label: 'Recovery Action' },
  { field: 'status',            label: 'Status' },
  { field: 'attempt_count',     label: 'Attempts' },
];

const TransactionTable = ({ transactions, onRowClick, isLoading }) => {
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
        if (fStatus && t.status !== fStatus) return false;
        if (fReason && t.classified_reason !== fReason) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            t.transaction_id?.toLowerCase().includes(q) ||
            t.customer_id?.toLowerCase().includes(q) ||
            t.failure_code?.toLowerCase().includes(q) ||
            t.merchant_id?.toLowerCase().includes(q)
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
  }, [transactions, fStatus, fReason, search, sortField, sortDir]);

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
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-muted)' }} />
          <input
            id="txn-search"
            className="input pl-7"
            placeholder="Search transactions…"
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
          {REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>

        <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {rows.length} of {transactions.length} rows
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
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  {transactions.length === 0
                    ? 'No transactions yet — click "Run Full Demo" to generate data'
                    : 'No transactions match the current filters'}
                </td>
              </tr>
            ) : rows.map(txn => {
              const sm = STATUS_META[txn.status] || { label: txn.status, cls: '' };
              const ActionIcon = actionIcon(txn.recovery_action);
              const ReasonIcon = reasonIcon(txn.classified_reason);
              const reasonColor = REASON_COLORS[txn.classified_reason] || 'var(--color-text-muted)';

              return (
                <tr key={txn.transaction_id || txn._id} onClick={() => onRowClick(txn)}>
                  {/* Transaction ID */}
                  <td>
                    <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>
                      {(txn.transaction_id || '').substring(0, 18)}…
                    </span>
                  </td>

                  {/* Amount */}
                  <td>
                    <span className="font-semibold tabular-nums">
                      {formatINR(txn.amount)}
                    </span>
                  </td>

                  {/* Failure code */}
                  <td>
                    <span className="code-chip">{txn.failure_code}</span>
                    {txn.opted_out && (
                      <span className="ml-1 text-2xs font-medium px-1.5 py-0.5 rounded"
                        style={{ background: '#f1f5f9', color: '#64748b' }}>
                        Opted out
                      </span>
                    )}
                  </td>

                  {/* Classified reason */}
                  <td>
                    {txn.classified_reason ? (
                      <div className="flex items-center gap-1.5">
                        <ReasonIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: reasonColor }} />
                        <span className="text-xs font-medium capitalize" style={{ color: reasonColor }}>
                          {txn.classified_reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td><ConfidenceBar score={txn.confidence_score} /></td>

                  {/* Recovery action */}
                  <td>
                    {txn.recovery_action && txn.recovery_action !== 'none' ? (
                      <div className="flex items-center gap-1.5">
                        <ActionIcon className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                          {txn.recovery_action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td><span className={`badge ${sm.cls}`}>{sm.label}</span></td>

                  {/* Attempts */}
                  <td>
                    <span
                      className="font-mono text-xs"
                      style={{ color: txn.attempt_count >= 3 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
                    >
                      {txn.attempt_count}/3
                    </span>
                  </td>

                  {/* Row arrow */}
                  <td>
                    <IconChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
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

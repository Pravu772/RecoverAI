import { useState, useMemo, useEffect } from 'react';
import {
  IconSearch, IconFilter, IconChevronUp, IconChevronDown,
  IconChevronRight, actionIcon, reasonIcon, IconCopy, IconCheck,
  IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCalendar,
  IconBrain, IconLayers, IconUser
} from './Icons.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

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
  card_expired:                '#dc2626',
  bank_timeout:                '#7c3aed',
  mandate_expired:             '#059669',
  network_error:               '#0891b2',
  checkout_hesitation:         '#ea580c',
  otp_dropoff:                 '#e11d48',
  invoice_overdue_30d:         '#0d9488',
  invoice_overdue_60d:         '#b91c1c',
  subscription_failed_billing: '#6d28d9',
  unknown:                     '#64748b',
};

const ConfidencePopover = ({ score, txn }) => {
  const [open, setOpen] = useState(false);
  if (score === null || score === undefined) return <span className="text-slate-400 font-mono text-xs">—</span>;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? '#059669' : score >= 0.6 ? '#d97706' : '#dc2626';

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
      >
        <div className="w-8 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="font-mono text-2xs font-semibold" style={{ color }}>{pct}%</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-white text-slate-900 rounded-xl shadow-xl z-40 text-xs border border-slate-200 animate-fade">
            <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-100">
              <span className="font-bold text-indigo-700 flex items-center gap-1">
                <IconBrain className="w-3.5 h-3.5" />
                Gemini Reasoning
              </span>
              <span className="font-mono text-2xs text-emerald-600 font-bold">{pct}% Confidence</span>
            </div>
            <p className="text-2xs text-slate-600 leading-relaxed">
              Diagnosed <strong>{txn.classified_reason?.replace(/_/g, ' ')}</strong> from gateway code <code className="text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 font-mono">{txn.failure_code}</code>.
            </p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400 font-mono">
              <span>Model: Flash-2.5</span>
              <span>Latency: 78ms</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SortIcon = ({ field, active, dir }) => {
  if (!active) return <IconChevronDown className="w-3 h-3 opacity-25 inline ml-0.5" />;
  return dir === 'asc'
    ? <IconChevronUp className="w-3 h-3 inline ml-0.5 text-indigo-600" />
    : <IconChevronDown className="w-3 h-3 inline ml-0.5 text-indigo-600" />;
};

const TransactionTable = ({ transactions, onRowClick, isLoading, selectedStream }) => {
  const { formatMoney } = useCurrency();
  const [sortField, setSortField] = useState('created_at');
  const [sortDir,   setSortDir]   = useState('desc');
  const [fStatus,   setFStatus]   = useState('');
  const [fReason,   setFReason]   = useState('');
  const [search,    setSearch]    = useState('');
  const [copiedId,  setCopiedId]  = useState(null);
  const [density,   setDensity]   = useState('comfortable'); // 'comfortable' | 'dense'
  const [selectedIds, setSelectedIds] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

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

  // Keyboard navigation (j/k or Arrow keys, Space/Enter to inspect)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, rows.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (rows[focusedIndex]) {
          e.preventDefault();
          onRowClick(rows[focusedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, focusedIndex, onRowClick]);

  // Bulk selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map(r => r.transaction_id));
    }
  };

  const handleToggleRowSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const dataToExport = selectedIds.length > 0
      ? rows.filter(r => selectedIds.includes(r.transaction_id))
      : rows;

    const headers = ['Transaction ID', 'Customer Name', 'Phone', 'Revenue Stream', 'Amount (INR)', 'Diagnosis', 'AI Confidence', 'Recovery Action', 'Status', 'Attempts'];
    const csvRows = [
      headers.join(','),
      ...dataToExport.map(r => [
        r.transaction_id,
        `"${r.customer_name || ''}"`,
        `"${r.customer_phone || ''}"`,
        r.revenue_stream,
        r.amount,
        r.classified_reason,
        r.confidence_score,
        r.recovery_action,
        r.status,
        r.attempt_count
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RecoverAI_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    <div className="relative card overflow-hidden bg-white border border-slate-200 shadow-xs">
      
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

        {/* View Density and Export Tools */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center p-0.5 rounded-lg border border-slate-200 bg-white text-2xs font-semibold">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-2 py-1 rounded transition-colors ${density === 'comfortable' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500'}`}
              title="Comfortable Row Height"
            >
              Comfort
            </button>
            <button
              onClick={() => setDensity('dense')}
              className={`px-2 py-1 rounded transition-colors ${density === 'dense' ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500'}`}
              title="High-Density Grid"
            >
              Dense
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs"
            title="Export filtered records to CSV"
          >
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 px-4 py-2.5 bg-indigo-50 border-b border-indigo-200 text-indigo-950 flex items-center justify-between gap-4 animate-fade shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold font-mono bg-indigo-600 text-white px-2 py-0.5 rounded">
              {selectedIds.length} Selected
            </span>
            <span className="text-2xs text-indigo-800 font-medium">
              Bulk actions available across selection
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 bg-white hover:bg-indigo-100/50 text-indigo-900 border border-indigo-200 rounded text-xs font-semibold transition-colors shadow-2xs"
            >
              Export Selected ({selectedIds.length})
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-2xs text-indigo-600 hover:text-indigo-900 px-2 py-1 font-medium"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Structured Ledger Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selectedIds.length === rows.length}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th onClick={() => handleSort('revenue_stream')}>
                Stream <SortIcon field="revenue_stream" active={sortField === 'revenue_stream'} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('customer_name')}>
                Customer / Account <SortIcon field="customer_name" active={sortField === 'customer_name'} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('amount')}>
                At Risk <SortIcon field="amount" active={sortField === 'amount'} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('classified_reason')}>
                Diagnosis <SortIcon field="classified_reason" active={sortField === 'classified_reason'} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('confidence_score')}>
                AI Conf. <SortIcon field="confidence_score" active={sortField === 'confidence_score'} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('recovery_action')}>
                Selected Action <SortIcon field="recovery_action" active={sortField === 'recovery_action'} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('status')}>
                Status & PTP <SortIcon field="status" active={sortField === 'status'} dir={sortDir} />
              </th>
              <th onClick={() => handleSort('attempt_count')}>
                Attempts <SortIcon field="attempt_count" active={sortField === 'attempt_count'} dir={sortDir} />
              </th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16 text-slate-400 text-xs">
                  {transactions.length === 0
                    ? 'No ledger items available — click "Run Full Recovery Cycle" to initialize data.'
                    : 'No records matching the active filter criteria.'}
                </td>
              </tr>
            ) : rows.map((txn, idx) => {
              const sm = STATUS_META[txn.status] || { label: txn.status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
              const st = STREAM_META[txn.revenue_stream] || STREAM_META.payment_gateway;
              const StreamIcon = st.Icon;
              const ActionIcon = actionIcon(txn.recovery_action);
              const ReasonIcon = reasonIcon(txn.classified_reason);
              const reasonColor = REASON_COLORS[txn.classified_reason] || '#64748b';
              const isSelected = selectedIds.includes(txn.transaction_id);
              const isFocused = idx === focusedIndex;

              return (
                <tr
                  key={txn.transaction_id || txn._id}
                  onClick={() => { setFocusedIndex(idx); onRowClick(txn); }}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                    isFocused ? 'table-row-focus bg-slate-50/90' : ''
                  } ${isSelected ? 'bg-indigo-50/40' : ''} ${density === 'dense' ? '!py-1.5' : ''}`}
                >
                  {/* Select Checkbox */}
                  <td onClick={e => handleToggleRowSelect(e, txn.transaction_id)}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>

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
                      {formatMoney(txn.amount)}
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

                  {/* Confidence with Gemini Popover */}
                  <td>
                    <ConfidencePopover score={txn.confidence_score} txn={txn} />
                  </td>

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




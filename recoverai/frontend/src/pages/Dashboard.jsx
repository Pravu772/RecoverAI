import { useState, useEffect, useCallback } from 'react';
import { getTransactions, getDashboardSummary } from '../api/index.js';
import SummaryCards     from '../components/SummaryCards.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import AuditTrailDrawer from '../components/AuditTrailDrawer.jsx';
import ExceptionsPanel  from '../components/ExceptionsPanel.jsx';
import BatchDemoButton  from '../components/BatchDemoButton.jsx';
import BreakdownChart   from '../components/BreakdownChart.jsx';
import { IconRefreshCw, IconList, IconAlertTriangle, IconBarChart2, IconActivity, IconShield } from '../components/Icons.jsx';

const TABS = [
  { id: 'transactions', label: 'Transactions', Icon: IconList },
  { id: 'exceptions',   label: 'Exceptions',   Icon: IconAlertTriangle },
  { id: 'analytics',    label: 'Analytics',    Icon: IconBarChart2 },
];

const Dashboard = () => {
  const [transactions,     setTransactions]     = useState([]);
  const [summary,          setSummary]          = useState(null);
  const [selectedTxn,      setSelectedTxn]      = useState(null);
  const [loadingTxns,      setLoadingTxns]      = useState(false);
  const [loadingSummary,   setLoadingSummary]   = useState(false);
  const [activeTab,        setActiveTab]        = useState('transactions');
  const [selectedStream,   setSelectedStream]   = useState('all');
  const [lastRefreshed,    setLastRefreshed]    = useState(null);

  const refresh = useCallback(async () => {
    setLoadingTxns(true);
    setLoadingSummary(true);
    try {
      const [txnData, summaryData] = await Promise.all([
        getTransactions({ limit: 200 }),
        getDashboardSummary(),
      ]);
      setTransactions(txnData.transactions || []);
      setSummary(summaryData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Refresh failed:', err.message);
    } finally {
      setLoadingTxns(false);
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const exceptionCount = transactions.filter(t =>
    ['exception', 'max_retries_reached', 'pending_human', 'opted_out'].includes(t.status)
  ).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ── Top nav ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={() => setActiveTab('transactions')}>
            <img
              src="/logo-brand.png"
              alt="RecoverAI"
              className="h-7 w-auto object-contain"
            />
            <span
              className="text-2xs font-medium px-2 py-0.5 rounded-full hidden md:inline-flex"
              style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
            >
              Revenue Recovery
            </span>
          </div>

          {/* Center tabs */}
          <nav className="flex items-center gap-0.5">
            {TABS.map(tab => {
              const { Icon } = tab;
              const isActive = activeTab === tab.id;
              const count = tab.id === 'transactions' ? transactions.length
                          : tab.id === 'exceptions' ? exceptionCount
                          : null;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    color:  isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-accent-light)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-bg)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count !== null && count > 0 && (
                    <span
                      className="text-2xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
                      style={{
                        background: isActive ? 'var(--color-accent)' : '#e2e8f0',
                        color: isActive ? '#fff' : 'var(--color-text-secondary)',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {lastRefreshed && (
              <span className="text-2xs hidden md:block" style={{ color: 'var(--color-text-muted)' }}>
                Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              id="btn-refresh"
              onClick={refresh}
              disabled={loadingTxns}
              className="btn-ghost"
              title="Refresh"
            >
              <IconRefreshCw className={`w-4 h-4 ${loadingTxns ? 'animate-spin' : ''}`}
                style={{ animationDuration: '0.65s' }} />
            </button>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#059669' }} />
              <span className="text-2xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-6 py-6">

        {/* Top section: Demo controls + Metric cards */}
        <div className="grid grid-cols-1 xl:grid-cols-[340px,1fr] gap-4 mb-6">
          <BatchDemoButton onComplete={refresh} count={50} />
          <SummaryCards summary={summary} isLoading={loadingSummary} />
        </div>

        {/* ── Revenue Stream Filter Bar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 mr-2 ml-1">
              Risk Streams:
            </span>
            {[
              { id: 'all',                  label: '🌐 All Streams',       count: transactions.length },
              { id: 'payment_gateway',      label: '⚡ Gateway Failures',  count: transactions.filter(t => t.revenue_stream === 'payment_gateway').length },
              { id: 'checkout_abandonment', label: '🛒 Cart Drop-offs',    count: transactions.filter(t => t.revenue_stream === 'checkout_abandonment').length },
              { id: 'subscription_renewal', label: '🔄 Subscriptions',     count: transactions.filter(t => t.revenue_stream === 'subscription_renewal').length },
              { id: 'b2b_invoice',          label: '🏢 B2B Invoices',      count: transactions.filter(t => t.revenue_stream === 'b2b_invoice').length },
              { id: 'ptp',                  label: '🤝 PTP Tracker',       count: transactions.filter(t => ['committed', 'kept', 'broken'].includes(t.ptp_status)).length },
            ].map(st => {
              const isSel = selectedStream === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => { setSelectedStream(st.id); setActiveTab('transactions'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSel
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`text-2xs px-1.5 py-0.2 rounded-full font-mono ${
                    isSel ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="animate-fade">
          {activeTab === 'transactions' && (
            <TransactionTable
              transactions={transactions}
              selectedStream={selectedStream}
              onRowClick={setSelectedTxn}
              isLoading={loadingTxns}
            />
          )}
          {activeTab === 'exceptions' && (
            <ExceptionsPanel
              transactions={transactions}
              onRowClick={setSelectedTxn}
            />
          )}
          {activeTab === 'analytics' && (
            <BreakdownChart breakdown={summary?.breakdown_by_reason} />
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer
          className="mt-12 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="RecoverAI" className="w-4 h-4 object-contain" />
            <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>RecoverAI</span>
            <span>— Autonomous AI Payment Failure Recovery System</span>
          </div>
          <div className="flex items-center gap-3 text-2xs">
            <span>Bounded Execution</span>
            <span>•</span>
            <span>Auditable Decision Trail</span>
            <span>•</span>
            <span>Gemini AI Driven</span>
          </div>
        </footer>
      </main>

      {/* ── Audit drawer ────────────────────────────────────────────────────── */}
      {selectedTxn && (
        <AuditTrailDrawer
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

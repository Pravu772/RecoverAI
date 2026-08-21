import { useState, useEffect, useCallback } from 'react';
import { getTransactions, getDashboardSummary, getSimulatedTime } from '../api/index.js';
import SummaryCards from '../components/SummaryCards.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import AuditTrailDrawer from '../components/AuditTrailDrawer.jsx';
import ExceptionsPanel from '../components/ExceptionsPanel.jsx';
import BatchDemoButton from '../components/BatchDemoButton.jsx';
import BreakdownChart from '../components/BreakdownChart.jsx';

/**
 * Dashboard — main single-page view for RecoverAI.
 *
 * Layout:
 *  1. Header (logo + simulated time)
 *  2. Demo controls + summary cards
 *  3. Transaction table (full width)
 *  4. Breakdown charts + Exceptions panel (side by side on large screens)
 */
const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'exceptions'
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch all data
  const refresh = useCallback(async () => {
    setLoadingTxns(true);
    setLoadingSummary(true);
    setLastRefresh(new Date());

    try {
      const [txnData, summaryData, timeData] = await Promise.all([
        getTransactions({ limit: 200 }),
        getDashboardSummary(),
        getSimulatedTime(),
      ]);
      setTransactions(txnData.transactions || []);
      setSummary(summaryData);
      setSimulatedTime(timeData);
    } catch (err) {
      console.error('Refresh failed:', err.message);
    } finally {
      setLoadingTxns(false);
      setLoadingSummary(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-surface-900/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-lg shadow-glow-blue flex-shrink-0">
              ⚡
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary-400 to-teal-400 bg-clip-text text-transparent">
                RecoverAI
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Payment Failure Recovery System</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Simulated time chip */}
            {simulatedTime?.total_offset_hours > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <span className="text-amber-400 text-xs">⏩</span>
                <span className="text-xs text-amber-400 font-medium">
                  +{simulatedTime.total_offset_hours.toFixed(0)}h ahead
                </span>
              </div>
            )}

            {/* Backend status dot */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-700 rounded-full border border-surface-500">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 hidden sm:block">Live</span>
            </div>

            {/* Refresh */}
            <button
              id="btn-refresh"
              onClick={refresh}
              disabled={loadingTxns}
              className="p-2 rounded-xl hover:bg-surface-700 transition-colors text-slate-400 hover:text-slate-200 disabled:opacity-50"
              title="Refresh data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${loadingTxns ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Demo controls + summary cards */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-4 items-start">
          <BatchDemoButton onComplete={refresh} count={50} />
          <SummaryCards summary={summary} isLoading={loadingSummary} />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-surface-800 rounded-xl w-fit border border-surface-600">
          {[
            { id: 'all', label: 'All Transactions', count: transactions.length },
            { id: 'exceptions', label: 'Exceptions', count: transactions.filter(t => ['exception','max_retries_reached','pending_human','opted_out'].includes(t.status)).length },
            { id: 'charts', label: 'Analytics', count: null },
          ].map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-glow-blue'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-surface-600 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'all' && (
          <div className="animate-fade-in">
            <TransactionTable
              transactions={transactions}
              onRowClick={setSelectedTransaction}
              isLoading={loadingTxns}
            />
          </div>
        )}

        {activeTab === 'exceptions' && (
          <div className="animate-fade-in">
            <ExceptionsPanel
              transactions={transactions}
              onRowClick={setSelectedTransaction}
            />
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="animate-fade-in">
            <BreakdownChart breakdown={summary?.breakdown_by_reason} />
          </div>
        )}

        {/* Last refresh */}
        {lastRefresh && (
          <p className="text-xs text-slate-700 text-center">
            Last updated: {lastRefresh.toLocaleTimeString('en-IN')}
          </p>
        )}
      </main>

      {/* ── Audit Trail Drawer ─────────────────────────────────────────────── */}
      {selectedTransaction && (
        <AuditTrailDrawer
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

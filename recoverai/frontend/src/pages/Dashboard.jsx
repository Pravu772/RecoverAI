import { useState, useEffect, useCallback } from 'react';
import { getTransactions, getDashboardSummary, generateBatch, classifyBatch, recoverBatch, advanceTime } from '../api/index.js';
import SummaryCards           from '../components/SummaryCards.jsx';
import TransactionTable       from '../components/TransactionTable.jsx';
import AuditTrailDrawer       from '../components/AuditTrailDrawer.jsx';
import ExceptionsPanel        from '../components/ExceptionsPanel.jsx';
import BatchDemoButton        from '../components/BatchDemoButton.jsx';
import BreakdownChart         from '../components/BreakdownChart.jsx';
import ExecutiveROIBanner     from '../components/ExecutiveROIBanner.jsx';
import LiveActivityFeed       from '../components/LiveActivityFeed.jsx';
import ComplianceRulebookModal from '../components/ComplianceRulebookModal.jsx';
import CommandPaletteModal    from '../components/CommandPaletteModal.jsx';
import FailureInjectionModal  from '../components/FailureInjectionModal.jsx';
import PolicyTuningModal      from '../components/PolicyTuningModal.jsx';
import CFODigestModal         from '../components/CFODigestModal.jsx';
import ToastContainer         from '../components/ToastContainer.jsx';
import {
  IconRefreshCw, IconList, IconAlertTriangle, IconBarChart2,
  IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCalendar, IconLayers,
  IconSearch, IconShield, IconPlay
} from '../components/Icons.jsx';

const TABS = [
  { id: 'transactions', label: 'Transactions Ledger', Icon: IconList },
  { id: 'exceptions',   label: 'Exception Queue',     Icon: IconAlertTriangle },
  { id: 'analytics',    label: 'Revenue Analytics',   Icon: IconBarChart2 },
];

const STREAM_FILTERS = [
  { id: 'all',                  label: 'All Streams',          Icon: IconLayers },
  { id: 'payment_gateway',      label: 'Gateway Failures',     Icon: IconZap },
  { id: 'checkout_abandonment', label: 'Checkout Drop-offs',   Icon: IconShoppingCart },
  { id: 'subscription_renewal', label: 'Subscription Mandates', Icon: IconRepeat },
  { id: 'b2b_invoice',          label: 'B2B Receivables',      Icon: IconFileText },
  { id: 'ptp',                  label: 'PTP Commitments',      Icon: IconCalendar },
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
  const [toasts,           setToasts]           = useState([]);
  const [currency,         setCurrency]         = useState('INR');

  // Modals state
  const [complianceOpen,   setComplianceOpen]   = useState(false);
  const [paletteOpen,      setPaletteOpen]      = useState(false);
  const [injectionOpen,    setInjectionOpen]    = useState(false);
  const [policyOpen,       setPolicyOpen]       = useState(false);
  const [cfoOpen,          setCfoOpen]          = useState(false);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

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

  const handleRunBatchFromPalette = async () => {
    try {
      await generateBatch(50);
      await classifyBatch();
      await recoverBatch();
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdvanceTimeFromPalette = async () => {
    try {
      await advanceTime(2);
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const exceptionCount = transactions.filter(t =>
    ['exception', 'max_retries_reached', 'pending_human', 'opted_out', 'ptp_broken'].includes(t.status)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-6 h-15 flex items-center justify-between gap-6">

          {/* Brand & Product Identifier */}
          <div
            className="flex items-center gap-3.5 flex-shrink-0 cursor-pointer"
            onClick={() => { setSelectedStream('all'); setActiveTab('transactions'); }}
          >
            <img
              src="/logo-brand.png"
              alt="RecoverAI"
              className="h-7 w-auto object-contain"
            />
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Autonomous Revenue Recovery
              </span>
              <span className="text-2xs text-slate-400 font-mono">v1.4.0-prod</span>
            </div>
          </div>

          {/* Primary View Tabs */}
          <nav className="flex items-center p-1 bg-slate-100/80 rounded-lg border border-slate-200/60">
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
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {count !== null && count > 0 && (
                    <span
                      className={`text-2xs font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Controls & Environment Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Simulate Custom Failure Button */}
            <button
              onClick={() => setInjectionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 text-indigo-700 text-2xs font-bold transition-all shadow-2xs"
              title="Inject a custom failure scenario live"
            >
              <IconZap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Simulate Gateway Drop</span>
            </button>

            {/* Spotlight Search Shortcut Button */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-2xs transition-colors"
            >
              <IconSearch className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Actions…</span>
              <kbd className="font-mono bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-400">⌘K</kbd>
            </button>

            {/* Currency Switcher */}
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg text-2xs font-mono font-bold text-slate-700 outline-none cursor-pointer"
              title="Switch Display Currency"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>

            <button
              id="btn-refresh"
              onClick={refresh}
              disabled={loadingTxns}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Refresh ledger state"
            >
              <IconRefreshCw className={`w-4 h-4 ${loadingTxns ? 'animate-spin' : ''}`} />
            </button>

            {/* Live Operational Pipeline Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-2xs font-bold tracking-tight">Active Engine</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Content ─────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-6 py-6">

        {/* Priority 4: Executive ROI & Unit Economics Banner */}
        <ExecutiveROIBanner
          summary={summary}
          onOpenCompliance={() => setComplianceOpen(true)}
          onOpenCFO={() => setCfoOpen(true)}
          onOpenPolicy={() => setPolicyOpen(true)}
        />

        {/* Executive Overview Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[330px,1fr] gap-4 mb-6">
          <BatchDemoButton onComplete={refresh} count={50} />
          <SummaryCards summary={summary} isLoading={loadingSummary} />
        </div>

        {/* Priority 1: Real-Time Live Activity Feed & Pipeline Stream */}
        <LiveActivityFeed
          transactions={transactions}
          onSelectTxn={setSelectedTxn}
        />

        {/* ── Risk Category & Ledger Filter Bar ───────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Risk Streams
            </span>

            {STREAM_FILTERS.map(st => {
              const { Icon } = st;
              const isSel = selectedStream === st.id;
              const count = st.id === 'all'
                ? transactions.length
                : st.id === 'ptp'
                ? transactions.filter(t => ['committed', 'kept', 'broken'].includes(t.ptp_status)).length
                : transactions.filter(t => t.revenue_stream === st.id).length;

              return (
                <button
                  key={st.id}
                  onClick={() => { setSelectedStream(st.id); setActiveTab('transactions'); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isSel
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-white' : 'text-slate-400'}`} />
                  <span>{st.label}</span>
                  <span className={`text-2xs px-1.5 py-0.2 rounded-full font-mono font-medium ${
                    isSel ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Views */}
        <div className="animate-fade">
          {activeTab === 'transactions' && (
            <TransactionTable
              transactions={transactions}
              selectedStream={selectedStream}
              onRowClick={setSelectedTxn}
              isLoading={loadingTxns}
              currency={currency}
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

        {/* ── Enterprise Footer ──────────────────────────────────────────────── */}
        <footer className="mt-12 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">RecoverAI Platform</span>
            <span>— Autonomous Revenue Recovery & Bounded Intervention Architecture</span>
          </div>
          <div className="flex items-center gap-3 text-2xs text-slate-400 font-mono">
            <span>Deterministic Routing</span>
            <span>•</span>
            <span>Gemini Reasoning</span>
            <span>•</span>
            <span>Immutable Audit Provenance</span>
          </div>
        </footer>
      </main>

      {/* ── Audit & Diagnostic Drawer ──────────────────────────────────────── */}
      {selectedTxn && (
        <AuditTrailDrawer
          transaction={selectedTxn}
          onClose={() => setSelectedTxn(null)}
        />
      )}

      {/* ── Compliance Rulebook Modal ───────────────────────────────────────── */}
      <ComplianceRulebookModal
        isOpen={complianceOpen}
        onClose={() => setComplianceOpen(false)}
      />

      {/* ── Command Palette Modal ───────────────────────────────────────────── */}
      <CommandPaletteModal
        isOpen={paletteOpen}
        onClose={setPaletteOpen}
        onSelectStream={setSelectedStream}
        onRunBatch={handleRunBatchFromPalette}
        onAdvanceTime={handleAdvanceTimeFromPalette}
        onOpenCompliance={() => setComplianceOpen(true)}
      />

      {/* ── Failure Injection Playground Modal ──────────────────────────────── */}
      <FailureInjectionModal
        isOpen={injectionOpen}
        onClose={() => setInjectionOpen(false)}
        onSuccess={() => {
          refresh();
          addToast('Failure Injected', 'Custom scenario processed through Gemini classifier and recovery engine.', 'success');
        }}
      />

      {/* ── Policy Tuning Studio Modal ──────────────────────────────────────── */}
      <PolicyTuningModal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
        onSave={(params) => {
          addToast('Policy Updated', `Governance invariants applied: ${params.maxAttempts} max retries, ${params.confidenceCutoff}% confidence cutoff.`, 'success');
        }}
      />

      {/* ── CFO Digest Briefing Modal ───────────────────────────────────────── */}
      <CFODigestModal
        isOpen={cfoOpen}
        onClose={() => setCfoOpen(false)}
        summary={summary}
        transactions={transactions}
      />

      {/* ── Toast Notifications Stack ──────────────────────────────────────── */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  );
};

export default Dashboard;



import { useState, useEffect, useCallback, useRef } from 'react';
import { getTransactions, getDashboardSummary, generateBatch, classifyBatch, recoverBatch, advanceTime, getStreamUrl } from '../api/index.js';
import Sidebar from '../components/Sidebar.jsx';
import SummaryCards from '../components/SummaryCards.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import AuditTrailDrawer from '../components/AuditTrailDrawer.jsx';
import ExceptionsPanel from '../components/ExceptionsPanel.jsx';
import BatchDemoButton from '../components/BatchDemoButton.jsx';
import BreakdownChart from '../components/BreakdownChart.jsx';
import ExecutiveROIBanner from '../components/ExecutiveROIBanner.jsx';
import LiveActivityFeed from '../components/LiveActivityFeed.jsx';
import BatchReportModal from '../components/BatchReportModal.jsx';
import ChaosTestModal from '../components/ChaosTestModal.jsx';
import ComplianceRulebookModal from '../components/ComplianceRulebookModal.jsx';
import CommandPaletteModal from '../components/CommandPaletteModal.jsx';
import FailureInjectionModal from '../components/FailureInjectionModal.jsx';
import PolicyTuningModal from '../components/PolicyTuningModal.jsx';
import CFODigestModal from '../components/CFODigestModal.jsx';
import WorkspaceRBACModal from '../components/WorkspaceRBACModal.jsx';
import PolicyFlowVisualizerModal from '../components/PolicyFlowVisualizerModal.jsx';
import ToastContainer from '../components/ToastContainer.jsx';
import {
  IconRefreshCw, IconList, IconAlertTriangle, IconBarChart2,
  IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCalendar, IconLayers,
  IconSearch, IconShield, IconPlay, IconUser, IconActivity, IconTrendingUp
} from '../components/Icons.jsx';

import { useCurrency } from '../context/CurrencyContext.jsx';

const Dashboard = ({ onFirstLoad }) => {
  const firstLoadFired = useRef(false);
  const { currency, setCurrency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [selectedStream, setSelectedStream] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Multi-Tenant RBAC State
  const [currentTenant, setCurrentTenant] = useState({ id: 'MER_SWIGGY', name: 'Swiggy Food & Instamart', tier: 'Enterprise Tier-1', logoText: 'SW' });
  const [currentRole, setCurrentRole] = useState({ id: 'cfo', label: 'Finance CFO / VP Finance' });

  // Modals state
  const [batchReportOpen, setBatchReportOpen] = useState(false);
  const [chaosOpen, setChaosOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [injectionOpen, setInjectionOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [cfoOpen, setCfoOpen] = useState(false);
  const [rbacOpen, setRbacOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);


  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // SSE Stream Listener for real-time live events
  useEffect(() => {
    const streamUrl = getStreamUrl();
    const eventSource = new EventSource(streamUrl);


    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'audit_event') {
          addToast(
            `Recovery Action: ${payload.action || 'Dispatched'}`,
            `Txn ${payload.transaction_id ? payload.transaction_id.substring(0, 10) : ''}… updated to ${payload.status}`,
            payload.status === 'recovered' ? 'success' : 'info'
          );
          // Non-blocking refresh
          getDashboardSummary().then(s => setSummary(s)).catch(() => { });
        }
      } catch (err) {
        console.error('SSE Message parsing error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const data = await getTransactions({ limit: 200 });
      const list = Array.isArray(data) ? data : data?.transactions || [];
      setTransactions(list);
      setLastRefreshed(new Date());
      return list;
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
      return [];
    } finally {
      setLoadingTxns(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
      return data;
    } catch (e) {
      console.error('Failed to fetch summary:', e);
      return null;
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([fetchTransactions(), fetchSummary()]);
    // Signal the loading screen exactly once — on the very first successful fetch
    if (!firstLoadFired.current) {
      firstLoadFired.current = true;
      onFirstLoad?.();
    }
    return results;
  }, [fetchTransactions, fetchSummary, onFirstLoad]);

  useEffect(() => {
    refresh();
  }, [refresh]);


  const handleRunBatch = async () => {
    try {
      await generateBatch(50);
      await classifyBatch();
      await recoverBatch();
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdvanceTime = async () => {
    try {
      await advanceTime(2);
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setTimeout(() => {
      const el = document.getElementById('main-content-view');
      if (el) {
        const headerOffset = 72;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }, 60);
  };

  const handleSelectStream = (streamId) => {
    setSelectedStream(streamId);
    setActiveTab('transactions');
    setTimeout(() => {
      const el = document.getElementById('main-content-view');
      if (el) {
        const headerOffset = 72;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }, 60);
  };

  const exceptionCount = transactions.filter(t =>
    ['exception', 'max_retries_reached', 'pending_human', 'opted_out', 'ptp_broken'].includes(t.status)
  ).length;

  const streamCounts = {
    all: transactions.length,
    payment_gateway: transactions.filter(t => t.revenue_stream === 'payment_gateway').length,
    checkout_abandonment: transactions.filter(t => t.revenue_stream === 'checkout_abandonment').length,
    subscription_renewal: transactions.filter(t => t.revenue_stream === 'subscription_renewal').length,
    b2b_invoice: transactions.filter(t => t.revenue_stream === 'b2b_invoice').length,
    ptp: transactions.filter(t => ['committed', 'kept', 'broken'].includes(t.ptp_status)).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex selection:bg-indigo-100 selection:text-indigo-900">

      {/* ── Left Sidebar Navigation ────────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        selectedStream={selectedStream}
        setSelectedStream={handleSelectStream}
        transactionsCount={transactions.length}
        exceptionsCount={exceptionCount}
        streamCounts={streamCounts}
        currentTenant={currentTenant}
        currentRole={currentRole}
        onOpenRBAC={() => setRbacOpen(true)}
        onOpenFlow={() => setFlowOpen(true)}
        onOpenInjection={() => setInjectionOpen(true)}
        onOpenCFO={() => setCfoOpen(true)}
        onOpenPolicy={() => setPolicyOpen(true)}
        onOpenCompliance={() => setComplianceOpen(true)}
        onOpenBatchReport={() => setBatchReportOpen(true)}
        onOpenChaos={() => setChaosOpen(true)}
      />


      {/* ── Main Workspace Area ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">

        {/* Streamlined Top Utility Header */}
        <header className="sticky top-0 z-30 glass-nav border-b border-slate-200/80 shadow-2xs h-16 px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Left Zone: Title, Tenant Badge & Engine Status */}
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">
              {activeTab === 'transactions' ? 'Transactions Ledger'
                : activeTab === 'exceptions' ? 'Exception Resolution Queue'
                  : 'Revenue Recovery Analytics'}
            </h1>
            <span className="text-2xs font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 hidden sm:inline-block truncate">
              {currentTenant.name}
            </span>

            {/* Live Operational Pipeline Indicator Adjacent to Title */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-emerald-500/20" />
              </span>
              <span className="text-2xs font-bold tracking-tight hidden md:inline">Engine Active</span>
            </div>
          </div>

          {/* Center Zone: Quick Command Search */}
          <div className="hidden lg:flex items-center justify-center flex-1 max-w-xs">
            <button
              onClick={() => setPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 text-xs transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <IconSearch className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                <span>Search actions or rules…</span>
              </div>
              <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-3xs text-slate-500">⌘K</kbd>
            </button>
          </div>

          {/* Right Zone: Strict 3-Item Primary Action Cluster */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Outage Drill Quick Trigger */}
            <button
              onClick={() => setChaosOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Test self-healing circuit breaker & graceful outage fallback"
            >
              <IconZap className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Outage Drill</span>
            </button>

            {/* Currency Selector */}
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
              title="Switch Display Currency"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>

            {/* Refresh Button */}
            <button
              id="btn-refresh"
              onClick={refresh}
              disabled={loadingTxns}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Refresh ledger state"
            >
              <IconRefreshCw className={`w-4 h-4 ${loadingTxns ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">

          {/* Priority 4: Executive ROI & Unit Economics Banner */}
          <ExecutiveROIBanner
            summary={summary}
            onOpenCFO={() => setCfoOpen(true)}
            onOpenPolicy={() => setPolicyOpen(true)}
          />

          {/* Executive Overview Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[340px,1fr] gap-4">
            <BatchDemoButton
              onComplete={refresh}
              onOpenReport={() => setBatchReportOpen(true)}
              count={50}
              isInitialEmpty={transactions.length === 0 && (!summary || summary.total_transactions === 0)}
            />
            <SummaryCards summary={summary} isLoading={loadingSummary} />
          </div>

          {/* Real-Time Live Activity Feed */}
          <LiveActivityFeed
            transactions={transactions}
            onSelectTxn={setSelectedTxn}
          />

          {/* Dynamic Views */}
          <div id="main-content-view" className="animate-fade scroll-mt-20">
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
                onResolved={refresh}
              />
            )}
            {activeTab === 'analytics' && (
              <BreakdownChart
                transactions={transactions}
                summary={summary}
              />
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
      </div>

      {/* ── Batch Test Results Hero Modal (Priority 1) ─────────────────────── */}
      <BatchReportModal
        isOpen={batchReportOpen}
        onClose={() => setBatchReportOpen(false)}
        onSelectTxn={setSelectedTxn}
      />

      {/* ── Graceful Failure / Chaos Test Modal (Priority 2) ────────────────── */}
      <ChaosTestModal
        isOpen={chaosOpen}
        onClose={() => setChaosOpen(false)}
        onSelectTxn={setSelectedTxn}
        onSuccess={() => {
          refresh();
          addToast('Chaos Test Completed', 'Simulated Gemini API outage gracefully handled by circuit breaker fallback.', 'success');
        }}
      />

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
        onRunBatch={handleRunBatch}
        onAdvanceTime={handleAdvanceTime}
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
        currentTenant={currentTenant}
        onSelectTenant={(t) => {
          setCurrentTenant(t);
          addToast('Workspace Switched', `CFO Briefing updated to: ${t.name}`, 'info');
        }}
        summary={summary}
        transactions={transactions}
      />


      {/* ── Multi-Tenant RBAC Modal ─────────────────────────────────────────── */}
      <WorkspaceRBACModal
        isOpen={rbacOpen}
        onClose={() => setRbacOpen(false)}
        currentTenant={currentTenant}
        currentRole={currentRole}
        onSelectTenant={(t) => {
          setCurrentTenant(t);
          addToast('Workspace Switched', `Active organization set to: ${t.name}`, 'info');
        }}
        onSelectRole={(r) => {
          setCurrentRole(r);
          addToast('Permissions Updated', `Active persona: ${r.label}`, 'info');
        }}
      />

      {/* ── Policy Flow Visualizer Modal ────────────────────────────────────── */}
      <PolicyFlowVisualizerModal
        isOpen={flowOpen}
        onClose={() => setFlowOpen(false)}
      />

      {/* ── Toast Notifications Stack ──────────────────────────────────────── */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
      />
    </div>
  );
};

export default Dashboard;


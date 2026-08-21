import { useState, useEffect, useCallback } from 'react';
import { getTransactions, getDashboardSummary, generateBatch, classifyBatch, recoverBatch, advanceTime } from '../api/index.js';
import Sidebar                from '../components/Sidebar.jsx';
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
import WorkspaceRBACModal     from '../components/WorkspaceRBACModal.jsx';
import PolicyFlowVisualizerModal from '../components/PolicyFlowVisualizerModal.jsx';
import ToastContainer         from '../components/ToastContainer.jsx';
import {
  IconRefreshCw, IconList, IconAlertTriangle, IconBarChart2,
  IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCalendar, IconLayers,
  IconSearch, IconShield, IconPlay, IconUser, IconActivity
} from '../components/Icons.jsx';

import { useCurrency } from '../context/CurrencyContext.jsx';

const Dashboard = () => {
  const { currency, setCurrency } = useCurrency();
  const [transactions,     setTransactions]     = useState([]);
  const [summary,          setSummary]          = useState(null);
  const [selectedTxn,      setSelectedTxn]      = useState(null);
  const [loadingTxns,      setLoadingTxns]      = useState(false);
  const [loadingSummary,   setLoadingSummary]   = useState(false);
  const [activeTab,        setActiveTab]        = useState('transactions');
  const [selectedStream,   setSelectedStream]   = useState('all');
  const [lastRefreshed,    setLastRefreshed]    = useState(null);
  const [toasts,           setToasts]           = useState([]);

  // Multi-Tenant RBAC State
  const [currentTenant,    setCurrentTenant]    = useState({ id: 'MER_SWIGGY', name: 'Swiggy Food & Instamart', tier: 'Enterprise Tier-1', logoText: 'SW' });
  const [currentRole,      setCurrentRole]      = useState({ id: 'cfo', label: 'Finance CFO / VP Finance' });

  // Modals state
  const [complianceOpen,   setComplianceOpen]   = useState(false);
  const [paletteOpen,      setPaletteOpen]      = useState(false);
  const [injectionOpen,    setInjectionOpen]    = useState(false);
  const [policyOpen,       setPolicyOpen]       = useState(false);
  const [cfoOpen,          setCfoOpen]          = useState(false);
  const [rbacOpen,         setRbacOpen]         = useState(false);
  const [flowOpen,         setFlowOpen]         = useState(false);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // SSE Stream Listener for real-time live events
  useEffect(() => {
    const eventSource = new EventSource('/api/stream/events');

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
          getDashboardSummary().then(s => setSummary(s)).catch(() => {});
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
      const data = await getTransactions(selectedStream);
      setTransactions(Array.isArray(data) ? data : data?.transactions || []);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    } finally {
      setLoadingTxns(false);
    }
  }, [selectedStream]);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (e) {
      console.error('Failed to fetch summary:', e);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchTransactions();
    fetchSummary();
  }, [fetchTransactions, fetchSummary]);

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

  const exceptionCount = transactions.filter(t =>
    ['exception', 'max_retries_reached', 'pending_human', 'opted_out', 'ptp_broken'].includes(t.status)
  ).length;

  const streamCounts = {
    all:                  transactions.length,
    payment_gateway:      transactions.filter(t => t.revenue_stream === 'payment_gateway').length,
    checkout_abandonment: transactions.filter(t => t.revenue_stream === 'checkout_abandonment').length,
    subscription_renewal: transactions.filter(t => t.revenue_stream === 'subscription_renewal').length,
    b2b_invoice:          transactions.filter(t => t.revenue_stream === 'b2b_invoice').length,
    ptp:                  transactions.filter(t => ['committed', 'kept', 'broken'].includes(t.ptp_status)).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex selection:bg-indigo-100 selection:text-indigo-900">

      {/* ── Left Sidebar Navigation ────────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedStream={selectedStream}
        setSelectedStream={setSelectedStream}
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
      />

      {/* ── Main Workspace Area ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        
        {/* Streamlined Top Utility Header */}
        <header className="sticky top-0 z-30 glass-nav border-b border-slate-200/80 shadow-2xs h-16 px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-slate-900">
              {activeTab === 'transactions' ? 'Transactions & Recovery Ledger'
               : activeTab === 'exceptions' ? 'Exception Resolution Queue'
               : 'Revenue Recovery Analytics & Trends'}
            </h1>
            <span className="text-3xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {currentTenant.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Spotlight Search */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-2xs transition-all shadow-2xs cursor-pointer"
            >
              <IconSearch className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Actions…</span>
              <kbd className="font-mono bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-400">⌘K</kbd>
            </button>

            {/* Currency Selector */}
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-2xs font-mono font-bold text-slate-700 outline-none cursor-pointer shadow-2xs"
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
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
              title="Refresh ledger state"
            >
              <IconRefreshCw className={`w-4 h-4 ${loadingTxns ? 'animate-spin' : ''}`} />
            </button>

            {/* Live Operational Pipeline Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-emerald-500/20" />
              </span>
              <span className="text-2xs font-bold tracking-tight">Engine Active</span>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="p-8 max-w-[1600px] w-full mx-auto space-y-6">

          {/* Priority 4: Executive ROI & Unit Economics Banner */}
          <ExecutiveROIBanner
            summary={summary}
            onOpenCompliance={() => setComplianceOpen(true)}
            onOpenCFO={() => setCfoOpen(true)}
            onOpenPolicy={() => setPolicyOpen(true)}
          />

          {/* Executive Overview Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[330px,1fr] gap-4">
            <BatchDemoButton onComplete={refresh} count={50} />
            <SummaryCards summary={summary} isLoading={loadingSummary} />
          </div>

          {/* Real-Time Live Activity Feed */}
          <LiveActivityFeed
            transactions={transactions}
            onSelectTxn={setSelectedTxn}
          />

          {/* Dynamic Views */}
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

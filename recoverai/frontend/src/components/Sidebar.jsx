import { useState, useEffect } from 'react';
import {
  IconList, IconAlertTriangle, IconBarChart2, IconLayers,
  IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCalendar,
  IconShield, IconUser, IconActivity, IconChevronDown, IconChevronUp
} from './Icons.jsx';

const MAIN_NAV = [
  { id: 'transactions', label: 'Transactions Ledger', Icon: IconList },
  { id: 'exceptions',   label: 'Exception Queue',     Icon: IconAlertTriangle },
  { id: 'analytics',    label: 'Revenue Analytics',   Icon: IconBarChart2 },
];

const STREAM_NAV = [
  { id: 'all',                  label: 'All Streams',          Icon: IconLayers },
  { id: 'payment_gateway',      label: 'Gateway Drops',        Icon: IconZap },
  { id: 'checkout_abandonment', label: 'Cart Abandonment',     Icon: IconShoppingCart },
  { id: 'subscription_renewal', label: 'Recurring Mandates',   Icon: IconRepeat },
  { id: 'b2b_invoice',          label: 'B2B Receivables',      Icon: IconFileText },
  { id: 'ptp',                  label: 'PTP Commitments',      Icon: IconCalendar },
];

const Sidebar = ({
  activeTab,
  setActiveTab,
  selectedStream,
  setSelectedStream,
  transactionsCount,
  exceptionsCount,
  streamCounts,
  currentTenant,
  currentRole,
  onOpenRBAC,
  onOpenFlow,
  onOpenInjection,
  onOpenCFO,
  onOpenPolicy,
  onOpenCompliance,
  onOpenBatchReport,
  onOpenChaos,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Keyboard shortcut listener ('[' to toggle sidebar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '[' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside
      className={`flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 z-40 select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* ── Brand Logo & App Header ────────────────────────────────────────── */}
      <div>
        <div className="h-16 px-4 border-b border-slate-200/80 flex items-center justify-between gap-2">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo-brand.png" alt="RecoverAI" className="h-7 w-auto object-contain" />
            </div>
          ) : (
            <div className="mx-auto">
              <img src="/logo-icon.png" alt="RecoverAI" className="w-7 h-7 object-contain rounded-lg shadow-2xs" />
            </div>
          )}

          {/* Toggle Button (Collapse / Expand) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer flex-shrink-0"
            title={isCollapsed ? 'Expand Sidebar ([)' : 'Collapse Sidebar ([)'}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* ── Navigation Sections (Scrollable) ───────────────────────────────── */}
        <div className="p-2.5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
          
          {/* Main Ledger Section */}
          <div>
            {!isCollapsed && (
              <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
                Platform Ledger
              </p>
            )}
            <nav className="space-y-0.5">
              {MAIN_NAV.map(item => {
                const { Icon } = item;
                const isActive = activeTab === item.id;
                const count = item.id === 'transactions' ? transactionsCount
                            : item.id === 'exceptions' ? exceptionsCount
                            : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? `${item.label} (${count || 0})` : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2'
                    } rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && count !== null && (
                      <span className={`text-2xs font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                        isActive ? 'bg-indigo-200/60 text-indigo-900 font-bold' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>

                );
              })}
            </nav>
          </div>

          {/* Risk Revenue Streams */}
          <div>
            {!isCollapsed && (
              <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
                Risk Streams
              </p>
            )}
            <nav className="space-y-0.5">
              {STREAM_NAV.map(item => {
                const { Icon } = item;
                const isSelected = selectedStream === item.id && activeTab === 'transactions';
                const count = streamCounts[item.id] || 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedStream(item.id); setActiveTab('transactions'); }}
                    title={isCollapsed ? `${item.label} (${count})` : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-1.5'
                    } rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className={`text-3xs font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-indigo-200/60 text-indigo-900' : 'text-slate-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* AI & Diagnostics Sandbox */}
          <div>
            {!isCollapsed && (
              <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
                Verification & Resilience
              </p>
            )}
            <nav className="space-y-0.5">
              {onOpenBatchReport && (
                <button
                  onClick={onOpenBatchReport}
                  title={isCollapsed ? 'Batch Results Report' : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-1.5'
                  } rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer`}
                >
                  <IconActivity className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  {!isCollapsed && <span>Batch Results Report (P1)</span>}
                </button>
              )}

              {onOpenChaos && (
                <button
                  onClick={onOpenChaos}
                  title={isCollapsed ? 'Chaos & Outage Drill' : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-1.5'
                  } rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer`}
                >
                  <IconZap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  {!isCollapsed && <span>Chaos & Outage Drill (P2)</span>}
                </button>
              )}

              <button
                onClick={onOpenFlow}
                title={isCollapsed ? 'Decision Flow Tree' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-1.5'
                } rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer`}
              >
                <IconLayers className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                {!isCollapsed && <span>Decision Flow Tree</span>}
              </button>

              <button
                onClick={onOpenInjection}
                title={isCollapsed ? 'Custom Sandbox Injection' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-1.5'
                } rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer`}
              >
                <IconShield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                {!isCollapsed && <span>Sandbox Injection</span>}
              </button>
            </nav>
          </div>


          {/* Governance & CFO Section */}
          <div>
            {!isCollapsed && (
              <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
                Governance
              </p>
            )}
            <nav className="space-y-0.5">
              <button
                onClick={onOpenCFO}
                title={isCollapsed ? 'CFO Revenue Digest' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-1.5'
                } rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer`}
              >
                <IconFileText className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                {!isCollapsed && <span>CFO Revenue Digest</span>}
              </button>

              <button
                onClick={onOpenPolicy}
                title={isCollapsed ? 'Policy Tuner' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-1.5'
                } rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer`}
              >
                <IconShield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                {!isCollapsed && <span>Policy Tuner</span>}
              </button>

              <button
                onClick={onOpenCompliance}
                title={isCollapsed ? 'Compliance Rulebook' : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-1.5'
                } rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer`}
              >
                <IconShield className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                {!isCollapsed && <span>Compliance Rulebook</span>}
              </button>
            </nav>
          </div>

        </div>
      </div>

      {/* ── Footer Multi-Tenant User Profile ───────────────────────────────── */}
      <div className="p-2.5 border-t border-slate-200 bg-slate-50/70">
        <div
          onClick={onOpenRBAC}
          className={`rounded-xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between p-2 gap-2.5'
          }`}
          title={isCollapsed ? `${currentTenant?.name} (${currentRole?.id.toUpperCase()})` : "Switch Tenant Workspace & RBAC Role"}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
              {currentTenant?.logoText || 'SW'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {currentTenant?.name || 'Organization'}
                </p>
                <p className="text-3xs text-slate-500 font-mono uppercase tracking-wider">
                  {currentRole?.id || 'CFO'} Role
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 flex-shrink-0" />
          )}
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;

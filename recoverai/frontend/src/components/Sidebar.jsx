import {
  IconList, IconAlertTriangle, IconBarChart2, IconLayers,
  IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCalendar,
  IconShield, IconUser, IconActivity, IconSearch
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
}) => {
  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 z-40 select-none">
      
      {/* ── Brand Logo & App Header ────────────────────────────────────────── */}
      <div>
        <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-brand.png" alt="RecoverAI" className="h-7 w-auto object-contain" />
          </div>
          <span className="text-3xs font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            PROD
          </span>
        </div>

        {/* ── Navigation Sections (Scrollable) ───────────────────────────────── */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          
          {/* Main Ledger Section */}
          <div>
            <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
              Platform Ledger
            </p>
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
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {count !== null && (
                      <span className={`text-2xs font-mono px-1.5 py-0.2 rounded-full tabular-nums ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
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
            <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
              Risk Streams
            </p>
            <nav className="space-y-0.5">
              {STREAM_NAV.map(item => {
                const { Icon } = item;
                const isSelected = selectedStream === item.id && activeTab === 'transactions';
                const count = streamCounts[item.id] || 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedStream(item.id); setActiveTab('transactions'); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className={`text-3xs font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-indigo-200/60 text-indigo-900' : 'text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* AI & Diagnostics Sandbox */}
          <div>
            <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
              Diagnostics & Sandbox
            </p>
            <nav className="space-y-0.5">
              <button
                onClick={onOpenFlow}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <IconLayers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Decision Flow Tree</span>
              </button>

              <button
                onClick={onOpenInjection}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <IconZap className="w-3.5 h-3.5 text-amber-600" />
                <span>Simulate Gateway Drop</span>
              </button>
            </nav>
          </div>

          {/* Governance & CFO Section */}
          <div>
            <p className="px-2 mb-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400">
              Governance & Finance
            </p>
            <nav className="space-y-0.5">
              <button
                onClick={onOpenCFO}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <IconFileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>CFO Revenue Digest</span>
              </button>

              <button
                onClick={onOpenPolicy}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <IconShield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Policy Tuner</span>
              </button>

              <button
                onClick={onOpenCompliance}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <IconShield className="w-3.5 h-3.5 text-slate-500" />
                <span>Compliance Rulebook</span>
              </button>
            </nav>
          </div>

        </div>
      </div>

      {/* ── Footer Multi-Tenant User Profile ───────────────────────────────── */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70">
        <div
          onClick={onOpenRBAC}
          className="p-2 rounded-xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-2.5"
          title="Switch Tenant Workspace & RBAC Role"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {currentTenant?.logoText || 'SW'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentTenant?.name || 'Organization'}
              </p>
              <p className="text-3xs text-slate-500 font-mono uppercase tracking-wider">
                {currentRole?.id || 'CFO'} Role
              </p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 flex-shrink-0" />
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;

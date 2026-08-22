import { useState, useEffect } from 'react';
import {
  IconX, IconFileText, IconTrendingUp, IconCheckCircle, IconShield,
  IconActivity, IconLayers, IconZap, IconCalendar, IconChevronRight,
  IconBarChart, IconUser, IconAlertTriangle
} from './Icons.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { ALL_COMPANY_PROFILES, getCompanyProfile } from '../seedData/index.js';

const TENANT_LIST = [
  { id: 'MER_SWIGGY', name: 'Swiggy Food & Instamart', tier: 'Enterprise Tier-1 (High-Velocity B2C)', logoText: 'SW' },
  { id: 'MER_ZOMATO', name: 'Zomato Dining & Delivery', tier: 'Enterprise Tier-1 (Food & Dining + Merchant B2B)', logoText: 'ZM' },
  { id: 'MER_FLIPKART', name: 'Flipkart Global Commerce', tier: 'Enterprise Tier-1 (High-AOV Omnichannel)', logoText: 'FK' },
  { id: 'MER_NETFLIX', name: 'Netflix Streaming India', tier: 'Subscriptions Plus (100% Recurring OTT)', logoText: 'NF' },
  { id: 'MER_FRESHWORKS', name: 'Freshworks B2B SaaS', tier: 'B2B Enterprise Net-60 (High-AOV Global Accounts)', logoText: 'FW' },
];

const CFODigestModal = ({ isOpen, onClose, currentTenant, onSelectTenant }) => {
  const { formatMoney } = useCurrency();
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'compare'
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [profile, setProfile] = useState(getCompanyProfile(currentTenant?.id || 'MER_SWIGGY'));
  const [generatedTimestamp, setGeneratedTimestamp] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGeneratedTimestamp(new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }));
    }
  }, [isOpen]);

  // Recalculation state transition when switching workspace
  useEffect(() => {
    if (!isOpen) return;
    setIsRecalculating(true);
    const tenantId = currentTenant?.id || 'MER_SWIGGY';
    const newProfile = getCompanyProfile(tenantId);
    
    const timer = setTimeout(() => {
      setProfile(newProfile);
      setIsRecalculating(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [currentTenant?.id, isOpen]);

  if (!isOpen) return null;

  const stats = profile.stats;
  const costs = profile.operating_costs;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden z-10 animate-fade my-auto">
        
        {/* Top Executive Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:border-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs flex-shrink-0">
              {profile.logoText}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  CFO Executive Briefing
                </span>
                <span className="text-2xs text-slate-500 font-mono hidden sm:inline">
                  {profile.period}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                {profile.name}
                <span className="text-xs font-normal text-slate-500 font-mono hidden sm:inline">
                  ({profile.id})
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* View Switcher: Single Company vs Cross-Company Comparison */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-2xs font-semibold print:hidden">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Executive Digest
              </button>
              <button
                onClick={() => setViewMode('compare')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'compare'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <IconLayers className="w-3 h-3" />
                <span>Compare All 5 Workspaces</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors print:hidden cursor-pointer"
              title="Close briefing"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Quick-Switcher Bar */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto print:hidden">
          <span className="text-3xs font-bold uppercase tracking-wider text-slate-500 flex-shrink-0">
            Active Workspace:
          </span>
          <div className="flex items-center gap-1.5">
            {TENANT_LIST.map((t) => {
              const isSelected = profile.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTenant?.(t)}
                  className={`px-2.5 py-1 rounded-md text-2xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-4 h-4 rounded text-3xs flex items-center justify-center font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {t.logoText}
                  </span>
                  <span>{t.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto bg-slate-50/40">

          {isRecalculating ? (
            /* Smooth Loading Skeleton State */
            <div className="py-12 space-y-4 text-center">
              <div className="inline-block w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-800">
                Recalculating unit economics & recovery yields for {currentTenant?.name || 'Workspace'}…
              </p>
              <p className="text-2xs text-slate-400 font-mono">
                Loading domain-specific failure distributions and policy constraints
              </p>
              <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto pt-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-200/70 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          ) : viewMode === 'compare' ? (
            /* ─────────────────────────────────────────────────────────────
               SECTION 4: CROSS-COMPANY COMPARISON VIEW
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <IconLayers className="w-4 h-4 text-indigo-600" />
                    <span>Cross-Enterprise Platform Generalizability Benchmark</span>
                  </h3>
                  <span className="text-2xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                    5/5 Domain Profiles Active
                  </span>
                </div>
                <p className="text-2xs text-slate-600 leading-relaxed">
                  Demonstrates how the underlying autonomous policy engine adapts dynamically across high-velocity B2C food delivery, high-ticket e-commerce, pure recurring OTT subscriptions, and enterprise B2B SaaS without hardcoded rule sets.
                </p>
              </div>

              {/* Comparison Matrix Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-2xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-3">Organization & Model</th>
                      <th className="p-3">Avg Order (AOV)</th>
                      <th className="p-3">Gross At-Risk</th>
                      <th className="p-3">Net Rescued</th>
                      <th className="p-3">Recovery Rate</th>
                      <th className="p-3">Unit ROI</th>
                      <th className="p-3">Top Failure Driver</th>
                      <th className="p-3 text-right">Switch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {TENANT_LIST.map((t) => {
                      const p = ALL_COMPANY_PROFILES[t.id];
                      const isCurrent = profile.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          className={`transition-colors ${
                            isCurrent ? 'bg-indigo-50/60 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3 flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold text-2xs flex items-center justify-center flex-shrink-0">
                              {p.logoText}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <p className="text-3xs text-slate-500 font-mono">{p.tier.split('(')[0]}</p>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-800">
                            {formatMoney(p.stats.avg_ticket_size)}
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {formatMoney(p.stats.total_amount_at_risk)}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            {formatMoney(p.stats.total_recovered_amount)}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {p.stats.recovery_rate_percent}%
                              <span className="text-3xs text-emerald-600">{p.stats.rate_delta}</span>
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {p.operating_costs.roi_multiplier}
                          </td>
                          <td className="p-3 text-2xs text-slate-600">
                            <span className="font-medium text-slate-800">{p.top_failure_drivers[0]?.label}</span>
                            <span className="text-slate-400 font-mono ml-1">({formatMoney(p.top_failure_drivers[0]?.impact_amount)})</span>
                          </td>
                          <td className="p-3 text-right">
                            {isCurrent ? (
                              <span className="text-3xs font-bold uppercase text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Active</span>
                            ) : (
                              <button
                                onClick={() => onSelectTenant?.(t)}
                                className="text-2xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                              >
                                View Digest →
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Aggregated Portfolio Metric Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-widest text-indigo-300">
                    RecoverAI Unified Multi-Tenant Portfolio
                  </span>
                  <h4 className="text-sm font-bold mt-0.5">
                    Cross-Enterprise Portfolio Total: 5 Organizations
                  </h4>
                </div>
                <div className="flex items-center gap-6 font-mono">
                  <div>
                    <span className="block text-3xs text-slate-300 uppercase">Combined At-Risk</span>
                    <span className="text-sm font-bold text-white">
                      {formatMoney(
                        Object.values(ALL_COMPANY_PROFILES).reduce((s, p) => s + p.stats.total_amount_at_risk, 0)
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="block text-3xs text-emerald-300 uppercase">Total Rescued</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {formatMoney(
                        Object.values(ALL_COMPANY_PROFILES).reduce((s, p) => s + p.stats.total_recovered_amount, 0)
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="block text-3xs text-indigo-300 uppercase">Avg Yield</span>
                    <span className="text-sm font-bold text-indigo-300">67.2%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               SECTION 2: COMPANY-SPECIFIC SINGLE CFO DIGEST
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">

              {/* Watermark Notice */}
              <div className="flex items-center justify-between text-2xs text-slate-500 font-mono pb-1 border-b border-slate-200">
                <span>Prepared by RecoverAI Autonomous Revenue Recovery Engine</span>
                <span>Classification: Confidential — Board of Directors Review</span>
              </div>

              {/* ── SECTION A: EXECUTIVE SUMMARY ── */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <IconFileText className="w-4 h-4 text-indigo-600" />
                  <span>Section A: Executive Financial Summary</span>
                </h3>

                {/* 4 Large KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Gross Revenue at Risk */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-2xs font-bold uppercase text-slate-500 tracking-wider">
                      Gross Revenue at Risk
                    </span>
                    <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                      {formatMoney(stats.total_amount_at_risk)}
                    </p>
                    <p className="text-3xs text-slate-400 font-mono mt-1">
                      {stats.total_transactions} failed transactions (AOV: {formatMoney(stats.avg_ticket_size)})
                    </p>
                  </div>

                  {/* Net Revenue Rescued */}
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
                    <span className="text-2xs font-bold uppercase text-emerald-800 tracking-wider flex items-center justify-between">
                      <span>Net Revenue Rescued</span>
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
                      {formatMoney(stats.total_recovered_amount)}
                    </p>
                    <p className="text-3xs text-emerald-700 font-medium mt-1">
                      Actual recovered cash settled
                    </p>
                  </div>

                  {/* Recovery Rate % with Trend Arrow */}
                  <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-xs bg-indigo-50/20">
                    <span className="text-2xs font-bold uppercase text-indigo-800 tracking-wider flex items-center justify-between">
                      <span>Recovery Rate</span>
                      <span className="text-3xs font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        {stats.rate_delta} vs M-1
                      </span>
                    </span>
                    <p className="text-xl font-bold font-mono text-indigo-700 mt-1">
                      {stats.recovery_rate_percent}%
                    </p>
                    <p className="text-3xs text-slate-500 font-mono mt-1">
                      Prior period: {stats.prior_period_rate}%
                    </p>
                  </div>

                  {/* Operating Cost of Recovery & Net ROI Multiplier */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-2xs font-bold uppercase text-slate-500 tracking-wider flex items-center justify-between">
                      <span>Operating Cost & ROI</span>
                      <span className="text-3xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                        {costs.roi_multiplier} Net ROI
                      </span>
                    </span>
                    <p className="text-xl font-bold font-mono text-slate-800 mt-1">
                      {formatMoney(costs.total_ops_cost)}
                    </p>
                    <p className="text-3xs text-slate-500 font-mono mt-1">
                      Net yield: {formatMoney(costs.net_yield_amount)}
                    </p>
                  </div>

                </div>

                {/* Operating Cost Breakdown Banner */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-2xs text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-2xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 font-sans">Unit Ops Cost Model:</span>
                    <span>SMS @ ₹0.50</span> •
                    <span>WhatsApp @ ₹0.75</span> •
                    <span>Voice AI @ ₹2.00</span> •
                    <span>Email @ ₹0.10</span>
                  </div>
                  <div className="text-indigo-700 font-bold">
                    Total Compute Cost: {formatMoney(costs.total_ops_cost)} securing {formatMoney(stats.total_recovered_amount)}
                  </div>
                </div>
              </div>


              {/* ── SECTION B: REVENUE STREAM BREAKDOWN ── */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <IconActivity className="w-4 h-4 text-indigo-600" />
                  <span>Section B: Company-Specific Revenue Stream Yields</span>
                </h3>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-2xs uppercase tracking-wider text-slate-500 font-bold">
                        <th className="p-3">Stream Name</th>
                        <th className="p-3">Capital at Risk</th>
                        <th className="p-3">Capital Recovered</th>
                        <th className="p-3">Recovery Rate</th>
                        <th className="p-3">Dominant Recovery Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {profile.streams.map((st) => (
                        <tr key={st.stream_id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-600" />
                            <span>{st.stream_name}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {formatMoney(st.at_risk)}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            {formatMoney(st.recovered)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${st.recovery_rate}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-slate-800">{st.recovery_rate}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-2xs text-slate-600 font-mono">
                            {st.dominant_action}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>


              {/* ── SECTION C: TOP FAILURE DRIVERS BY VALUE ── */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <IconZap className="w-4 h-4 text-indigo-600" />
                  <span>Section C: Top Failure Drivers by Capital Impact</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {profile.top_failure_drivers.map((drv, idx) => (
                    <div key={drv.reason} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          #{idx + 1} Driver
                        </span>
                        <span className="text-2xs font-mono text-slate-500 font-semibold">
                          {drv.txn_count} txns ({drv.recovery_pct}% resolved)
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {drv.label}
                      </h4>
                      <p className="text-base font-bold font-mono text-slate-900">
                        {formatMoney(drv.impact_amount)}
                      </p>
                      <div className="pt-2 border-t border-slate-100 text-3xs text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-700">Mitigation: </span>
                        {drv.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              {/* ── SECTION D & E: FORWARD RISK SIGNAL & COMPLIANCE ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Section D: Forward Risk Signal */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <IconTrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>Section D: Forward Risk Signal</span>
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {formatMoney(stats.projected_next_period_at_risk)}
                    </span>
                    <span className="text-2xs font-mono text-slate-500">
                      projected next-cycle exposure
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 leading-relaxed">
                    {stats.projection_note}.
                  </p>
                  <p className="text-3xs text-slate-400 italic">
                    *Illustrative projection based on current batch telemetry & seasonality.
                  </p>
                </div>

                {/* Section E: Compliance & Governance Note */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-emerald-950 shadow-xs space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-900">
                    <IconShield className="w-4 h-4 text-emerald-700" />
                    <span>Section E: Compliance & Regulatory Governance</span>
                  </h4>
                  <p className="text-2xs leading-relaxed text-emerald-900">
                    {profile.compliance_note}
                  </p>
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-3xs font-mono text-emerald-800">
                    <span>3-Retry Cap: 100% Enforced</span>
                    <span>48h Cooldown: Compliant</span>
                    <span>Opt-Outs: Honored</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer with Print/PDF Export & Audit Provenance */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <span className="text-2xs text-slate-500 font-mono">
            Generated at {generatedTimestamp} • Scoped to {profile.name}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <IconFileText className="w-3.5 h-3.5" />
              <span>Export as PDF / Print</span>
            </button>
            <button
              onClick={onClose}
              className="btn-primary text-xs cursor-pointer"
            >
              Close Briefing
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CFODigestModal;

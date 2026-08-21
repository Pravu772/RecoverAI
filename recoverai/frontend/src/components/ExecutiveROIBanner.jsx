import { IconTrendingUp, IconShield, IconActivity, IconZap } from './Icons.jsx';

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ExecutiveROIBanner = ({ summary, onOpenCompliance, onOpenCFO, onOpenPolicy }) => {
  const s = summary || {};
  const recoveredAmount = s.total_recovered_amount || 0;
  const recoveredCount  = s.status_breakdown?.recovered || 0;
  
  // Realistic unit economics calculation for AI compute & communication
  // Avg ₹4 per recovery touch (WhatsApp API / SMS / Gemini Flash API token cost)
  const estimatedCost = Math.round((s.total_transactions || 0) * 4.2);
  const netSavings = Math.max(0, recoveredAmount - estimatedCost);
  const roiMultiplier = estimatedCost > 0 ? (recoveredAmount / estimatedCost).toFixed(1) : '100+';

  return (
    <div className="mb-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Left Side: Value proposition and branding */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
            <IconTrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Executive Economics
              </span>
              <span className="text-2xs text-slate-500 font-mono">Net Yield Multiplier: {roiMultiplier}x</span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">
              Autonomous Capital Recovery & Unit Economics
            </h2>
          </div>
        </div>

        {/* Center: Financial Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Gross Rescued</p>
            <p className="text-base font-bold font-mono text-emerald-600 mt-0.5">
              {formatINR(recoveredAmount)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Est. AI Ops Cost</p>
            <p className="text-base font-bold font-mono text-slate-700 mt-0.5">
              {formatINR(estimatedCost)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Net Recovered</p>
            <p className="text-base font-bold font-mono text-indigo-700 mt-0.5">
              {formatINR(netSavings)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Intervention Yield</p>
            <p className="text-base font-bold font-mono text-emerald-600 mt-0.5">
              {s.recovery_rate_percent || 0}%
            </p>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full lg:w-auto">
          <button
            onClick={onOpenCFO}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex-1 lg:flex-none shadow-2xs"
          >
            <span>CFO Briefing</span>
          </button>

          <button
            onClick={onOpenPolicy}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex-1 lg:flex-none shadow-2xs"
          >
            <IconShield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Policy Tuner</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExecutiveROIBanner;

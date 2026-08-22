import { IconTrendingUp, IconShield } from './Icons.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

const ExecutiveROIBanner = ({ summary, onOpenCFO, onOpenPolicy }) => {
  const { formatMoney } = useCurrency();
  const s = summary || {};
  const recoveredAmount = s.total_recovered_amount || 0;
  
  // Realistic unit economics calculation for AI compute & communication
  const estimatedCost = Math.round((s.total_transactions || 0) * 4.2);
  const netSavings = Math.max(0, recoveredAmount - estimatedCost);
  const roiMultiplier = estimatedCost > 0 ? (recoveredAmount / estimatedCost).toFixed(1) : (recoveredAmount > 0 ? '100+' : '0.0');

  return (
    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-50/50 via-white to-white border border-emerald-200/80 border-l-4 border-l-emerald-500 shadow-xs transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Left Headline: ROI Multiplier Spotlight */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-600/20">
            <span className="text-2xs font-bold uppercase tracking-wider opacity-80 leading-none mb-0.5">Yield</span>
            <span className="text-xl font-black font-mono leading-none tracking-tight">
              {roiMultiplier}x
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                Executive Economics
              </span>
              <span className="text-xs text-slate-500 font-medium">Autonomous Recovery Yield</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Net Capital Rescued vs. AI Ops Overhead
            </h2>
          </div>
        </div>

        {/* Center: Financial Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Net Recovered</p>
            <p className="text-xl font-bold font-mono text-emerald-600 mt-0.5">
              {formatMoney(netSavings)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Gross Rescued</p>
            <p className="text-sm font-bold font-mono text-slate-800 mt-1">
              {formatMoney(recoveredAmount)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Est. AI Ops Cost</p>
            <p className="text-sm font-bold font-mono text-slate-600 mt-1">
              {formatMoney(estimatedCost)}
            </p>
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Intervention Rate</p>
            <p className="text-sm font-bold font-mono text-indigo-600 mt-1">
              {s.recovery_rate_percent || 0}%
            </p>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0 w-full lg:w-auto">
          <button
            onClick={onOpenCFO}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex-1 lg:flex-none shadow-2xs cursor-pointer"
          >
            <span>CFO Briefing</span>
          </button>

          <button
            onClick={onOpenPolicy}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all flex-1 lg:flex-none shadow-2xs cursor-pointer"
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

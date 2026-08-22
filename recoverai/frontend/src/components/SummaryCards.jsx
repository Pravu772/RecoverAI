import { useState, useEffect, useRef } from 'react';
import { IconAlertTriangle, IconCheckCircle, IconTrendingUp, IconXCircle, IconCalendar } from './Icons.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';

/** Smooth count-up animation hook */
const useCountUp = (target, duration = 900) => {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  const prev = useRef(0);

  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (target === from) return;

    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
};

const Sparkline = ({ color = '#059669', isPositive = true }) => {
  const points = isPositive
    ? "0,14 6,12 12,13 18,9 24,11 30,6 36,8 42,2"
    : "0,4 6,7 12,5 18,10 24,8 30,12 36,11 42,15";

  return (
    <svg className="w-10 h-3.5 overflow-visible flex-shrink-0" viewBox="0 0 42 16" fill="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const MetricCard = ({ label, value, sub, Icon, accentColor, isCurrency, isPercent, isLoading, isPositive = true }) => {
  const { formatMoney } = useCurrency();
  const num = typeof value === 'number' ? value : 0;
  const counted = useCountUp(num);

  const display = isLoading ? null
    : isCurrency ? formatMoney(counted)
    : isPercent  ? `${value.toFixed(1)}%`
    : counted.toLocaleString('en-IN');

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-2.5 group">
      {/* Top Row: Label on Left, Icon on Right */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-bold uppercase tracking-wider text-slate-500 truncate">{label}</p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{ background: accentColor + '14', color: accentColor }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Main Metric Value (Full Width - Zero Collision) */}
      <div className="min-w-0">
        {isLoading ? (
          <div className="skeleton h-6 w-24 my-0.5" />
        ) : (
          <p
            className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-900 tabular-nums animate-count truncate"
            title={display}
          >
            {display}
          </p>
        )}
      </div>
      
      {/* Bottom Row: Subtitle & Sparkline */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 gap-2">
        {sub && !isLoading ? (
          <p className="text-3xs text-slate-500 font-medium truncate">{sub}</p>
        ) : (
          <div className="skeleton h-2 w-14" />
        )}
        {!isLoading && <Sparkline color={accentColor} isPositive={isPositive} />}
      </div>
    </div>
  );
};

const SummaryCards = ({ summary, isLoading }) => {
  const s = summary || {};
  const exceptionTotal = (s.exceptions_count || 0) + (s.pending_human_count || 0) + (s.max_retries_count || 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <MetricCard
        label="Total at Risk"
        value={s.total_amount_at_risk || 0}
        sub={`${s.total_transactions || 0} items`}
        Icon={IconAlertTriangle}
        accentColor="#d97706"
        isCurrency
        isLoading={isLoading}
      />
      <MetricCard
        label="Amount Recovered"
        value={s.total_recovered_amount || 0}
        sub={`${s.status_breakdown?.recovered || 0} recovered`}
        Icon={IconCheckCircle}
        accentColor="#059669"
        isCurrency
        isLoading={isLoading}
      />
      <MetricCard
        label="Recovery Rate"
        value={s.recovery_rate_percent || 0}
        sub="all streams"
        Icon={IconTrendingUp}
        accentColor="#1d4ed8"
        isPercent
        isLoading={isLoading}
      />
      <MetricCard
        label="PTP Commitments"
        value={s.ptp_committed_amount || 0}
        sub={`${s.ptp_committed_count || 0} accounts`}
        Icon={IconCalendar}
        accentColor="#7c3aed"
        isCurrency
        isLoading={isLoading}
      />
      <MetricCard
        label="Needs Attention"
        value={exceptionTotal}
        sub="exceptions"
        Icon={IconXCircle}
        accentColor="#dc2626"
        isLoading={isLoading}
      />
    </div>
  );
};

export default SummaryCards;

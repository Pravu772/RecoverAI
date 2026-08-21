import { useState, useEffect, useRef } from 'react';
import { IconAlertTriangle, IconCheckCircle, IconTrendingUp, IconXCircle } from './Icons.jsx';

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

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const MetricCard = ({ label, value, sub, Icon, accentColor, isCurrency, isPercent, isLoading }) => {
  const num = typeof value === 'number' ? value : 0;
  const counted = useCountUp(num);

  const display = isLoading ? null
    : isCurrency ? formatINR(counted)
    : isPercent  ? `${value.toFixed(1)}%`
    : counted.toLocaleString('en-IN');

  return (
    <div className="metric-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="stat-label">{label}</p>
          {isLoading ? (
            <div className="skeleton h-8 w-28 mt-1" />
          ) : (
            <p className="stat-value animate-count">{display}</p>
          )}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accentColor + '12', color: accentColor }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {sub && !isLoading && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
      )}
      {isLoading && <div className="skeleton h-3 w-20" />}
    </div>
  );
};

const SummaryCards = ({ summary, isLoading }) => {
  const s = summary || {};
  const exceptionTotal = (s.exceptions_count || 0) + (s.pending_human_count || 0) + (s.max_retries_count || 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Total at Risk"
        value={s.total_amount_at_risk || 0}
        sub={`${s.total_transactions || 0} transactions`}
        Icon={IconAlertTriangle}
        accentColor="#d97706"
        isCurrency
        isLoading={isLoading}
      />
      <MetricCard
        label="Amount Recovered"
        value={s.total_recovered_amount || 0}
        sub={`${s.status_breakdown?.recovered || 0} transactions`}
        Icon={IconCheckCircle}
        accentColor="#059669"
        isCurrency
        isLoading={isLoading}
      />
      <MetricCard
        label="Recovery Rate"
        value={s.recovery_rate_percent || 0}
        sub="of all transactions"
        Icon={IconTrendingUp}
        accentColor="#1d4ed8"
        isPercent
        isLoading={isLoading}
      />
      <MetricCard
        label="Needs Attention"
        value={exceptionTotal}
        sub="exceptions + human review"
        Icon={IconXCircle}
        accentColor="#dc2626"
        isLoading={isLoading}
      />
    </div>
  );
};

export default SummaryCards;

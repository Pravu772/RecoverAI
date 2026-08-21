import { useState, useEffect, useRef } from 'react';

/**
 * Animated number counter — smoothly counts up to the target value.
 */
const useCountUp = (target, duration = 1200) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }

    const start = Date.now();
    const startVal = 0;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
};

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatPercent = (val) => `${val.toFixed(1)}%`;

/**
 * Individual metric card with animated counter.
 */
const MetricCard = ({ title, value, subtitle, icon, color, isCurrency, isPercent, isLoading }) => {
  const numericVal = typeof value === 'number' ? value : 0;
  const counted = useCountUp(numericVal);

  const displayValue = isLoading
    ? '—'
    : isCurrency
      ? formatINR(counted)
      : isPercent
        ? formatPercent(value)
        : counted.toLocaleString('en-IN');

  return (
    <div className={`metric-card group relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl ${color.glow}`} />

      <div className="relative z-10">
        {/* Icon + Title row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
            {isLoading ? (
              <div className="h-9 w-32 shimmer rounded-lg" />
            ) : (
              <p className={`text-3xl font-bold tracking-tight ${color.text} animate-counter-up`}>
                {displayValue}
              </p>
            )}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color.bg} flex-shrink-0`}>
            {icon}
          </div>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
        )}

        {/* Bottom accent line */}
        <div className={`h-0.5 w-full mt-4 rounded-full ${color.bar}`} />
      </div>
    </div>
  );
};

/**
 * SummaryCards — top row of four key metrics.
 */
const SummaryCards = ({ summary, isLoading }) => {
  const s = summary || {};

  const cards = [
    {
      title: 'Total at Risk',
      value: s.total_amount_at_risk || 0,
      subtitle: `${s.total_transactions || 0} failed transactions`,
      icon: '⚠️',
      isCurrency: true,
      color: {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        bar: 'bg-gradient-to-r from-amber-500 to-transparent',
        glow: 'bg-gradient-radial from-amber-500/5 to-transparent',
      },
    },
    {
      title: 'Recovered',
      value: s.total_recovered_amount || 0,
      subtitle: `${s.status_breakdown?.recovered || 0} transactions`,
      icon: '✅',
      isCurrency: true,
      color: {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        bar: 'bg-gradient-to-r from-emerald-500 to-transparent',
        glow: 'bg-gradient-radial from-emerald-500/5 to-transparent',
      },
    },
    {
      title: 'Recovery Rate',
      value: s.recovery_rate_percent || 0,
      subtitle: 'of all transactions recovered',
      icon: '📈',
      isPercent: true,
      color: {
        text: 'text-teal-400',
        bg: 'bg-teal-500/10',
        bar: 'bg-gradient-to-r from-teal-500 to-transparent',
        glow: 'bg-gradient-radial from-teal-500/5 to-transparent',
      },
    },
    {
      title: 'Exceptions',
      value: (s.exceptions_count || 0) + (s.pending_human_count || 0) + (s.max_retries_count || 0),
      subtitle: 'need human attention',
      icon: '🚨',
      color: {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        bar: 'bg-gradient-to-r from-rose-500 to-transparent',
        glow: 'bg-gradient-radial from-rose-500/5 to-transparent',
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} isLoading={isLoading} />
      ))}
    </div>
  );
};

export default SummaryCards;

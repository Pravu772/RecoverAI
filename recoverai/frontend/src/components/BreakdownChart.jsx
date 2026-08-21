import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

const REASON_CONFIG = {
  insufficient_funds: { label: 'Insuf. Funds',  color: '#f59e0b' },
  card_expired:       { label: 'Card Expired',  color: '#f97316' },
  bank_timeout:       { label: 'Bank Timeout',  color: '#3b82f6' },
  mandate_expired:    { label: 'Mandate Exp.',  color: '#8b5cf6' },
  network_error:      { label: 'Network Err.',  color: '#22d3ee' },
  unknown:            { label: 'Unknown',       color: '#64748b' },
};

const formatINR = (val) =>
  val >= 100000
    ? `₹${(val / 100000).toFixed(1)}L`
    : val >= 1000
      ? `₹${(val / 1000).toFixed(0)}K`
      : `₹${val}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-xs min-w-[160px]">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-slate-200 font-mono">
            {p.name === 'Recovery Rate' ? `${p.value}%` : formatINR(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * BreakdownChart — bar + donut charts showing recovery by failure reason.
 */
const BreakdownChart = ({ breakdown }) => {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <div className="glass-card p-6 flex items-center justify-center h-56 text-slate-500 text-sm">
        No data yet — run the demo to see charts
      </div>
    );
  }

  // Prepare bar chart data
  const barData = Object.entries(breakdown)
    .filter(([, v]) => v.total > 0)
    .map(([reason, v]) => ({
      name: REASON_CONFIG[reason]?.label || reason,
      reason,
      'Amount at Risk': v.amount_at_risk,
      'Recovered': v.amount_recovered,
      'Recovery Rate': v.recovery_rate,
    }));

  // Prepare donut data (total amount by reason)
  const donutData = Object.entries(breakdown)
    .filter(([, v]) => v.total > 0)
    .map(([reason, v]) => ({
      name: REASON_CONFIG[reason]?.label || reason,
      value: v.total,
      color: REASON_CONFIG[reason]?.color || '#94a3b8',
    }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Bar chart — amounts */}
      <div className="glass-card p-5">
        <h4 className="section-header mb-4">
          <span>💰</span> Recovery Amount by Reason
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tickFormatter={formatINR} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Amount at Risk" fill="#1e3457" radius={[4,4,0,0]} />
            <Bar dataKey="Recovered" radius={[4,4,0,0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={REASON_CONFIG[entry.reason]?.color || '#14b8a6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-sm bg-surface-600 border border-surface-500" />
            At Risk
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-sm bg-teal-500" />
            Recovered
          </div>
        </div>
      </div>

      {/* Donut chart — transaction count distribution */}
      <div className="glass-card p-5">
        <h4 className="section-header mb-4">
          <span>🍩</span> Failure Type Distribution
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {donutData.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [value, name]}
              contentStyle={{ background: '#0d1529', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '12px' }}
            />
            <Legend
              formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Recovery rate by reason — mini table */}
      <div className="glass-card p-5 xl:col-span-2">
        <h4 className="section-header mb-4"><span>📊</span> Recovery Rate by Reason</h4>
        <div className="space-y-3">
          {Object.entries(breakdown)
            .filter(([, v]) => v.total > 0)
            .sort((a, b) => b[1].recovery_rate - a[1].recovery_rate)
            .map(([reason, v]) => {
              const config = REASON_CONFIG[reason] || { label: reason, color: '#94a3b8' };
              return (
                <div key={reason} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-slate-400 truncate flex-shrink-0">{config.label}</div>
                  <div className="flex-1 bg-surface-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${v.recovery_rate}%`, backgroundColor: config.color }}
                    />
                  </div>
                  <div className="text-xs font-mono text-slate-300 w-10 text-right">{v.recovery_rate}%</div>
                  <div className="text-xs text-slate-600 w-16 text-right">{v.recovered}/{v.total}</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default BreakdownChart;

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';

const REASON_CONFIG = {
  insufficient_funds:          { label: 'Insuf. Funds',     color: '#d97706' },
  card_expired:                { label: 'Card Expired',     color: '#ea580c' },
  bank_timeout:                { label: 'Bank Timeout',     color: '#1d4ed8' },
  mandate_expired:             { label: 'Mandate Exp.',     color: '#7c3aed' },
  network_error:               { label: 'Network Err.',     color: '#0891b2' },
  checkout_hesitation:         { label: 'Cart Hesitation',  color: '#f97316' },
  otp_dropoff:                 { label: 'OTP Drop-off',     color: '#e11d48' },
  invoice_overdue_30d:         { label: 'Invoice 30d Due',  color: '#0d9488' },
  invoice_overdue_60d:         { label: 'Invoice 60d+ Due', color: '#be123c' },
  subscription_failed_billing: { label: 'Sub Billing Drop', color: '#6d28d9' },
  unknown:                     { label: 'Unknown/Other',    color: '#94a3b8' },
};

const fmtINR = (v) =>
  v >= 100000 ? `₹${(v/100000).toFixed(1)}L`
  : v >= 1000 ? `₹${(v/1000).toFixed(0)}K`
  : `₹${v}`;

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs min-w-[150px]" style={{ boxShadow: 'var(--shadow-md)' }}>
      <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color || 'var(--color-text-secondary)' }}>{p.name}</span>
          <span className="font-mono" style={{ color: 'var(--color-text-primary)' }}>
            {p.name === 'Rate' ? `${p.value}%` : fmtINR(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ children }) => (
  <p className="text-2xs font-semibold uppercase tracking-wider mb-4"
    style={{ color: 'var(--color-text-muted)' }}>
    {children}
  </p>
);

const BreakdownChart = ({ breakdown }) => {
  if (!breakdown || Object.keys(breakdown).length === 0) {
    return (
      <div className="card p-8 flex items-center justify-center text-sm"
        style={{ color: 'var(--color-text-muted)', height: 240 }}>
        No data — run the demo to see analytics
      </div>
    );
  }

  const barData = Object.entries(breakdown)
    .filter(([, v]) => v.total > 0)
    .map(([reason, v]) => ({
      name: REASON_CONFIG[reason]?.label || reason,
      reason,
      'At Risk': v.amount_at_risk,
      'Recovered': v.amount_recovered,
    }));

  const donutData = Object.entries(breakdown)
    .filter(([, v]) => v.total > 0)
    .map(([reason, v]) => ({
      name: REASON_CONFIG[reason]?.label || reason,
      value: v.total,
      color: REASON_CONFIG[reason]?.color || '#94a3b8',
    }));

  const rateData = Object.entries(breakdown)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].recovery_rate - a[1].recovery_rate);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Bar chart */}
      <div className="card p-5">
        <SectionHeader>Recovery Amount by Failure Type</SectionHeader>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtINR} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipContent />} />
            <Bar dataKey="At Risk" fill="#f1f5f9" radius={[3,3,0,0]} />
            <Bar dataKey="Recovered" radius={[3,3,0,0]}>
              {barData.map((e, i) => (
                <Cell key={i} fill={REASON_CONFIG[e.reason]?.color || '#1d4ed8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 pt-3"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }} />
            At Risk
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: '#1d4ed8' }} />
            Recovered
          </div>
        </div>
      </div>

      {/* Donut chart */}
      <div className="card p-5">
        <SectionHeader>Failure Type Distribution</SectionHeader>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {donutData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [v, n]}
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Legend
              formatter={(v) => <span style={{ color: '#475569', fontSize: '11px' }}>{v}</span>}
              iconSize={10}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Recovery rate bars — full width */}
      <div className="card p-5 xl:col-span-2">
        <SectionHeader>Recovery Rate by Failure Reason</SectionHeader>
        <div className="space-y-3">
          {rateData.map(([reason, v]) => {
            const cfg = REASON_CONFIG[reason] || { label: reason, color: '#94a3b8' };
            return (
              <div key={reason} className="flex items-center gap-3">
                <div className="w-24 text-xs flex-shrink-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {cfg.label}
                </div>
                <div className="flex-1 progress-track">
                  <div
                    className="progress-fill transition-all duration-700"
                    style={{ width: `${v.recovery_rate}%`, background: cfg.color }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-xs flex-shrink-0"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {v.recovery_rate}%
                </span>
                <span className="w-14 text-right text-xs flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)' }}>
                  {v.recovered}/{v.total}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BreakdownChart;

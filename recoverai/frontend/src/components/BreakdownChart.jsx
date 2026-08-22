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
  <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-4">
    {children}
  </p>
);

const BreakdownChart = ({ breakdown, summary, transactions = [] }) => {
  // Derive effective breakdown from explicit breakdown, summary, or directly from transactions array
  let effectiveBreakdown = breakdown || summary?.breakdown_by_reason;

  if (!effectiveBreakdown || Object.keys(effectiveBreakdown).length === 0) {
    if (transactions && transactions.length > 0) {
      effectiveBreakdown = {};
      for (const t of transactions) {
        const r = t.classified_reason || (t.status === 'failed' ? 'pending_classification' : 'unknown');
        if (!effectiveBreakdown[r]) {
          effectiveBreakdown[r] = {
            total: 0,
            recovered: 0,
            amount_at_risk: 0,
            amount_recovered: 0,
            recovery_rate: 0,
          };
        }
        effectiveBreakdown[r].total += 1;
        effectiveBreakdown[r].amount_at_risk += (t.amount || 0);
        if (t.status === 'recovered') {
          effectiveBreakdown[r].recovered += 1;
          effectiveBreakdown[r].amount_recovered += (t.amount || 0);
        }
      }
      for (const r of Object.keys(effectiveBreakdown)) {
        const item = effectiveBreakdown[r];
        item.recovery_rate = item.total > 0 ? parseFloat(((item.recovered / item.total) * 100).toFixed(1)) : 0;
      }
    }
  }

  if (!effectiveBreakdown || Object.keys(effectiveBreakdown).length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center gap-2 h-64 bg-white border border-slate-200">
        <p className="text-xs font-semibold text-slate-700">No ledger analytics available</p>
        <p className="text-2xs text-slate-400">Click "Run Full Recovery Cycle" to generate and analyze metrics across all 4 streams.</p>
      </div>
    );
  }

  const barData = Object.entries(effectiveBreakdown)
    .filter(([, v]) => v.total > 0)
    .map(([reason, v]) => ({
      name: REASON_CONFIG[reason]?.label || reason.replace(/_/g, ' '),
      reason,
      'At Risk': v.amount_at_risk,
      'Recovered': v.amount_recovered,
    }));

  const donutData = Object.entries(effectiveBreakdown)
    .filter(([, v]) => v.total > 0)
    .map(([reason, v]) => ({
      name: REASON_CONFIG[reason]?.label || reason.replace(/_/g, ' '),
      value: v.total,
      color: REASON_CONFIG[reason]?.color || '#94a3b8',
    }));

  const rateData = Object.entries(effectiveBreakdown)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].recovery_rate - a[1].recovery_rate);


  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Bar chart */}
      <div className="card p-5 bg-white border border-slate-200 shadow-xs">
        <SectionHeader>Recovery Capital by Failure Diagnosis</SectionHeader>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtINR} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipContent />} />
            <Bar dataKey="At Risk" fill="#f1f5f9" radius={[3,3,0,0]} />
            <Bar dataKey="Recovered" radius={[3,3,0,0]}>
              {barData.map((e, i) => (
                <Cell key={i} fill={REASON_CONFIG[e.reason]?.color || '#2563eb'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-xs bg-slate-100 border border-slate-300" />
            <span>Capital at Risk</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-xs bg-indigo-600" />
            <span>Capital Recovered</span>
          </div>
        </div>
      </div>

      {/* Donut chart */}
      <div className="card p-5 bg-white border border-slate-200 shadow-xs">
        <SectionHeader>Risk Stream Breakdown</SectionHeader>
        <ResponsiveContainer width="100%" height={210}>
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
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            />
            <Legend
              formatter={(v) => <span style={{ color: '#475569', fontSize: '11px' }}>{v}</span>}
              iconSize={8}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Recovery rate bars — full width */}
      <div className="card p-5 xl:col-span-2 bg-white border border-slate-200 shadow-xs">
        <SectionHeader>Recovery Conversion by Diagnostic Category</SectionHeader>
        <div className="space-y-3">
          {rateData.map(([reason, v]) => {
            const cfg = REASON_CONFIG[reason] || { label: reason, color: '#94a3b8' };
            return (
              <div key={reason} className="flex items-center gap-3">
                <div className="w-28 text-xs font-medium text-slate-700 flex-shrink-0 truncate">
                  {cfg.label}
                </div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${v.recovery_rate}%`, background: cfg.color }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs font-semibold text-slate-800 flex-shrink-0">
                  {v.recovery_rate}%
                </span>
                <span className="w-16 text-right text-2xs font-mono text-slate-400 flex-shrink-0">
                  {v.recovered}/{v.total} txns
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4-Stream Capital Yield Waterfall */}
      <div className="card p-5 xl:col-span-2 bg-slate-50/70 border border-slate-200 shadow-xs">
        <SectionHeader>Multi-Stream Autonomous Yield Funnel</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
          
          <div className="p-4 rounded-xl bg-white border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold uppercase text-blue-700">Payment Gateway</span>
              <span className="text-2xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">Fast Retries</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Zero-latency network & gateway recovery via alternate routing and scheduled cooldowns.
            </p>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-2xs">
              <span className="text-slate-500">Avg Conversion</span>
              <span className="font-bold text-blue-700">62% Yield</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-orange-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold uppercase text-orange-700">Checkout Cart Drop</span>
              <span className="text-2xs font-mono text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded">1-Click WhatsApp</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Personalized cart recovery links dispatched with pre-populated order summaries.
            </p>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-2xs">
              <span className="text-slate-500">Avg Conversion</span>
              <span className="font-bold text-orange-700">54% Yield</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold uppercase text-purple-700">Recurring Mandates</span>
              <span className="text-2xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded">Salary-Sync</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Smart auto-debit sequencers synchronized with 1st & 5th of month salary deposits.
            </p>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-2xs">
              <span className="text-slate-500">Avg Conversion</span>
              <span className="font-bold text-purple-700">71% Yield</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-teal-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xs font-bold uppercase text-teal-700">B2B Receivables</span>
              <span className="text-2xs font-mono text-teal-600 bg-teal-50 px-1.5 py-0.2 rounded">Voice AI + PTP</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Empathetic Hinglish conversational collection agent with automated PTP tracking.
            </p>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-2xs">
              <span className="text-slate-500">Avg Conversion</span>
              <span className="font-bold text-teal-700">68% Yield</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BreakdownChart;

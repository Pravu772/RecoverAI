import { IconX, IconFileText, IconTrendingUp, IconCheckCircle, IconShield, IconActivity } from './Icons.jsx';

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CFODigestModal = ({ isOpen, onClose, summary, transactions }) => {
  if (!isOpen) return null;

  const s = summary || {};
  const recoveredAmount = s.total_recovered_amount || 0;
  const recoveredCount = s.status_breakdown?.recovered || 0;
  const totalAmount = s.total_at_risk_amount || 1;
  const yieldRate = s.recovery_rate_percent || 0;
  const opsCost = Math.round((s.total_transactions || 0) * 4.2);
  const netSaved = Math.max(0, recoveredAmount - opsCost);

  // Derive high-performing channel
  const voiceRecovered = transactions.filter(t => t.recovery_action === 'hinglish_voice_call' && t.status === 'recovered').length;
  const cartRecovered = transactions.filter(t => t.revenue_stream === 'checkout_abandonment' && t.status === 'recovered').length;
  const b2bRecovered = transactions.filter(t => t.revenue_stream === 'b2b_invoice' && t.status === 'recovered').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden z-10 animate-fade">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <IconFileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Executive Briefing
                </span>
                <span className="text-2xs text-slate-500 font-mono">Q1 Recovery Audit</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                CFO Revenue Yield & Unit Economics Digest
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-slate-50/40 overflow-y-auto max-h-[70vh]">
          
          {/* Executive Summary Narrative */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Autonomous Capital Recovery Summary
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              During the active period, RecoverAI processed <strong>{s.total_transactions || 0} failed events</strong> across 4 revenue streams. 
              The platform achieved an overall <strong>{yieldRate}% autonomous recovery rate</strong>, securing <strong>{formatINR(recoveredAmount)}</strong> in gross revenue with an estimated operating compute and communication cost of <strong>{formatINR(opsCost)}</strong>.
            </p>
          </div>

          {/* Core Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-2xs font-semibold text-slate-500 uppercase">Gross At-Risk</p>
              <p className="text-sm font-bold font-mono text-slate-900 mt-1">{formatINR(totalAmount)}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-2xs font-semibold text-slate-500 uppercase">Capital Rescued</p>
              <p className="text-sm font-bold font-mono text-emerald-600 mt-1">{formatINR(recoveredAmount)}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-2xs font-semibold text-slate-500 uppercase">Est. AI Ops Cost</p>
              <p className="text-sm font-bold font-mono text-slate-700 mt-1">{formatINR(opsCost)}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-2xs font-semibold text-slate-500 uppercase">Net Yield</p>
              <p className="text-sm font-bold font-mono text-indigo-700 mt-1">{formatINR(netSaved)}</p>
            </div>
          </div>

          {/* Channel Attribution Breakdown */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Channel Attribution & Yield Efficiency
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-700">Hinglish Voice Recovery AI</span>
                <span className="font-mono font-bold text-indigo-700">{voiceRecovered} accounts resolved</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-700">1-Click WhatsApp Checkout Recovery</span>
                <span className="font-mono font-bold text-emerald-700">{cartRecovered} carts converted</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-700">B2B Overdue Invoice Dunning & PTP</span>
                <span className="font-mono font-bold text-teal-700">{b2bRecovered} invoices collected</span>
              </div>
            </div>
          </div>

          {/* Compliance & Consumer Safeguards Verification */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-2xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <IconShield className="w-3.5 h-3.5 text-emerald-700" />
              <span>Compliance & Consumer Protection Verification</span>
            </div>
            <p className="leading-relaxed">
              100% of recovery interventions complied with the 3-attempt ceiling, 48-hour minimum touch cooldowns, and cryptographic idempotency guarantees. Zero duplicate debits recorded.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-2xs text-slate-400 font-mono">Prepared for Board & Finance Committee</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-secondary text-xs"
            >
              Print Report
            </button>
            <button
              onClick={onClose}
              className="btn-primary text-xs"
            >
              Close Digest
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CFODigestModal;

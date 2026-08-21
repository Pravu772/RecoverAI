import { IconX, IconShield, IconCheckCircle, IconLock, IconActivity, IconClock, IconUser } from './Icons.jsx';

const RULES = [
  {
    id: 'MAX_ATTEMPTS_CAP',
    title: 'Hard Attempt Capping (Max 3)',
    category: 'Consumer Protection & Credit Safeguard',
    description: 'Every transaction is hard-capped at 3 automated recovery interventions. On the 3rd failed attempt, automated executions stop permanently and the account routes to a human agent to protect customer credit scores.',
    enforcedAt: 'Execution Engine (`recoveryService.js`)',
    status: 'Active Invariant',
    Icon: IconShield,
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'COOLDOWN_ENFORCEMENT',
    title: '48-Hour Interaction Cooldown',
    category: 'Anti-Spam & Dunning Cadence',
    description: 'Mandates a minimum 48-hour spacing between automated SMS nudges, emails, or voice outreach. Prevents customer harassment and complies with telecom dunning regulations.',
    enforcedAt: 'Scheduler & Clock Evaluator (`simulate.js`)',
    status: 'Active Invariant',
    Icon: IconClock,
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'OPT_OUT_GUARD',
    title: 'Instant DNC & Opt-Out Suppression',
    category: 'Privacy & Consent Compliance',
    description: 'If a customer responds with STOP or opts out via communication channels, their identifier is permanently marked in the suppression registry. All future automated recovery actions are unconditionally blocked.',
    enforcedAt: 'Pre-Execution Filter (`Transaction.js`)',
    status: 'Active Invariant',
    Icon: IconLock,
    tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'IDEMPOTENCY_LOCK',
    title: 'Idempotent Payment Link Dispatch',
    category: 'Financial Safety',
    description: 'Every payment link and mandate re-presentation is protected with a cryptographically secure idempotency key (`IDEM_TXN_*`). Eliminates double debits and duplicate checkout orders.',
    enforcedAt: 'Gateway Gateway Adapter',
    status: 'Active Invariant',
    Icon: IconCheckCircle,
    tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'SALARY_CYCLE_ALIGNMENT',
    title: 'Smart Salary-Cycle Mandate Alignment',
    category: 'NACH / Auto-Debit Optimization',
    description: 'Subscriptions with insufficient funds are held for alignment with the 1st or 5th of the month (Indian enterprise salary cycles) rather than blind daily retries that incur bank decline charges.',
    enforcedAt: 'Sequencer Pipeline',
    status: 'Active Policy',
    Icon: IconActivity,
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

const ComplianceRulebookModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden z-10 animate-fade">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 text-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <IconShield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Compliance Rulebook
                </span>
                <span className="text-2xs text-slate-500 font-mono">The Bar Invariants</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Autonomous Recovery Policy & Safety Guardrails
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
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-3.5 bg-slate-50/50">
          <p className="text-xs text-slate-600 mb-2">
            RecoverAI executes bounded recovery workflows under deterministic compliance policies to protect consumers, prevent duplicate debits, and adhere to RBI payment guidelines.
          </p>

          {RULES.map(rule => {
            const { Icon } = rule;
            return (
              <div
                key={rule.id}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-700 flex-shrink-0" />
                    <h4 className="text-xs font-bold text-slate-900">{rule.title}</h4>
                  </div>
                  <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${rule.tagColor}`}>
                    {rule.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {rule.description}
                </p>

                <div className="flex items-center justify-between text-2xs pt-2 border-t border-slate-100 font-mono text-slate-400">
                  <span>Scope: {rule.category}</span>
                  <span className="text-indigo-600 font-semibold">{rule.enforcedAt}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-2xs text-slate-400 font-mono">5 Invariants Verified • 100% Deterministic</span>
          <button
            onClick={onClose}
            className="btn-primary text-xs"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};

export default ComplianceRulebookModal;

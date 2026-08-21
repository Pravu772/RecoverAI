import { useState, useEffect } from 'react';
import {
  IconSearch, IconX, IconZap, IconShoppingCart, IconRepeat,
  IconFileText, IconCalendar, IconShield, IconPlay, IconFastForward
} from './Icons.jsx';

const CommandPaletteModal = ({
  isOpen, onClose, onSelectStream, onRunBatch, onAdvanceTime, onOpenCompliance
}) => {
  const [search, setSearch] = useState('');

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ACTIONS = [
    {
      id: 'run-batch',
      label: 'Run Full Recovery Pipeline (50 items)',
      sub: 'Executes classification & multi-stream recovery',
      Icon: IconPlay,
      action: () => { onRunBatch(); onClose(false); },
      category: 'Pipeline Actions',
    },
    {
      id: 'advance-clock',
      label: 'Advance Simulated Clock (+48 Hours)',
      sub: 'Evaluates PTP deadlines and unlocks cooldowns',
      Icon: IconFastForward,
      action: () => { onAdvanceTime(); onClose(false); },
      category: 'Pipeline Actions',
    },
    {
      id: 'show-compliance',
      label: 'Open Compliance & Safety Invariants Rulebook',
      sub: 'Inspect stopping rules & consumer protection safeguards',
      Icon: IconShield,
      action: () => { onOpenCompliance(); onClose(false); },
      category: 'Compliance',
    },
    {
      id: 'filter-gateway',
      label: 'Filter: Gateway Failures',
      sub: 'View timeout, expired cards, and low-balance debits',
      Icon: IconZap,
      action: () => { onSelectStream('payment_gateway'); onClose(false); },
      category: 'Risk Streams',
    },
    {
      id: 'filter-cart',
      label: 'Filter: Checkout Cart Drop-offs',
      sub: 'View cart hesitation & OTP abandonment records',
      Icon: IconShoppingCart,
      action: () => { onSelectStream('checkout_abandonment'); onClose(false); },
      category: 'Risk Streams',
    },
    {
      id: 'filter-sub',
      label: 'Filter: Subscription Mandates',
      sub: 'View recurring billing & salary sync mandates',
      Icon: IconRepeat,
      action: () => { onSelectStream('subscription_renewal'); onClose(false); },
      category: 'Risk Streams',
    },
    {
      id: 'filter-b2b',
      label: 'Filter: B2B Enterprise Receivables',
      sub: 'View Net-30 and Net-60 overdue invoice dunning',
      Icon: IconFileText,
      action: () => { onSelectStream('b2b_invoice'); onClose(false); },
      category: 'Risk Streams',
    },
    {
      id: 'filter-ptp',
      label: 'Filter: Promise-to-Pay (PTP) Commitments',
      sub: 'View accounts with promised payment dates',
      Icon: IconCalendar,
      action: () => { onSelectStream('ptp'); onClose(false); },
      category: 'Risk Streams',
    },
  ];

  const filtered = ACTIONS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.sub.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => onClose(false)} />

      {/* Palette Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden z-10 animate-fade">
        
        {/* Search Bar */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <IconSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none font-medium"
            placeholder="Type a command or filter risk streams…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <kbd className="px-1.5 py-0.5 text-2xs font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            Esc
          </kbd>
        </div>

        {/* Action List */}
        <div className="p-2 max-h-[380px] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands or actions found.
            </div>
          ) : (
            filtered.map(item => {
              const { Icon } = item;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  className="px-3 py-2.5 rounded-xl hover:bg-indigo-50/80 hover:border-indigo-200 border border-transparent transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-950 truncate">
                        {item.label}
                      </p>
                      <p className="text-2xs text-slate-500 truncate">
                        {item.sub}
                      </p>
                    </div>
                  </div>

                  <span className="text-2xs font-medium text-slate-400 group-hover:text-indigo-600 flex-shrink-0 font-mono">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400">
          <span>Quick actions & navigation</span>
          <span>Shortcut: <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">⌘K</kbd></span>
        </div>

      </div>
    </div>
  );
};

export default CommandPaletteModal;

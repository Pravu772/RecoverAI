import { useState } from 'react';
import { IconX, IconShield, IconCheckCircle, IconZap, IconActivity } from './Icons.jsx';

const PolicyTuningModal = ({ isOpen, onClose, onSave }) => {
  const [confidenceCutoff, setConfidenceCutoff] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [cooldownHours, setCooldownHours] = useState(48);
  const [enforceSalarySync, setEnforceSalarySync] = useState(true);
  const [savedAlert, setSavedAlert] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedAlert(true);
    setTimeout(() => {
      setSavedAlert(false);
      if (onSave) onSave({ confidenceCutoff, maxAttempts, cooldownHours, enforceSalarySync });
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden z-10 animate-fade">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <IconShield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Governance
                </span>
                <span className="text-2xs text-slate-500 font-mono">Policy Tuner</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Recovery Safeguards & Invariant Parameters
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

        {/* Content Sliders & Toggles */}
        <div className="p-6 space-y-5 bg-slate-50/40">
          
          {/* Confidence Slider */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                AI Confidence Threshold
              </label>
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {confidenceCutoff}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              step="5"
              value={confidenceCutoff}
              onChange={e => setConfidenceCutoff(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-2xs text-slate-500">
              Transactions with confidence below {confidenceCutoff}% route directly to human exception review.
            </p>
          </div>

          {/* Max Retry Cap */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                Max Automated Retries Before Escalation
              </label>
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {maxAttempts} Attempts
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[2, 3, 4].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMaxAttempts(val)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    maxAttempts === val
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {val} Attempts
                </button>
              ))}
            </div>
          </div>

          {/* Cooldown Period */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                Anti-Spam Customer Touch Cooldown
              </label>
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {cooldownHours} Hours
              </span>
            </div>
            <input
              type="range"
              min="24"
              max="72"
              step="12"
              value={cooldownHours}
              onChange={e => setCooldownHours(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-2xs text-slate-500">
              Minimum mandatory pause between automated SMS/Voice outreach to the same customer.
            </p>
          </div>

          {/* Salary Cycle Sync Toggle */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900">Synchronize with Indian Salary Cycle</p>
              <p className="text-2xs text-slate-500 mt-0.5">Hold failed recurring mandates for the 1st or 5th of month</p>
            </div>
            <button
              type="button"
              onClick={() => setEnforceSalarySync(!enforceSalarySync)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                enforceSalarySync ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                enforceSalarySync ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {savedAlert && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade">
              <IconCheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Policy rules successfully committed to execution engine</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary text-xs"
          >
            Apply Policy Changes
          </button>
        </div>

      </div>
    </div>
  );
};

export default PolicyTuningModal;

import { useState } from 'react';
import { IconX, IconLayers, IconZap, IconShoppingCart, IconRepeat, IconFileText, IconCheckCircle, IconShield } from './Icons.jsx';

const PolicyFlowVisualizerModal = ({ isOpen, onClose }) => {
  const [selectedNode, setSelectedNode] = useState(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden z-10 animate-fade">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <IconLayers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Decision Graph
                </span>
                <span className="text-2xs text-slate-500 font-mono">Visual Node Pipeline</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Autonomous Intervention Routing Logic Tree
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

        {/* Node Graph Interactive Canvas */}
        <div className="p-6 bg-slate-50/60 overflow-y-auto max-h-[70vh] space-y-6">
          <p className="text-xs text-slate-600">
            Click on any pipeline decision node to inspect its bounded invariants, routing logic, and fallback safeguards.
          </p>

          {/* Flow Diagram (Structured SVG & Card Graph) */}
          <div className="space-y-4">
            
            {/* 1. Intake Layer */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Stage 1: Multi-Stream Intake</span>
                <span className="text-2xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded">4 Active Ingest Channels</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
                <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900">
                  Gateway Timeout
                </div>
                <div className="p-2 bg-orange-50/70 border border-orange-200 rounded-lg text-xs font-semibold text-orange-900">
                  Cart Abandonment
                </div>
                <div className="p-2 bg-purple-50/70 border border-purple-200 rounded-lg text-xs font-semibold text-purple-900">
                  Recurring Mandate
                </div>
                <div className="p-2 bg-teal-50/70 border border-teal-200 rounded-lg text-xs font-semibold text-teal-900">
                  Overdue Invoices
                </div>
              </div>
            </div>

            {/* Downward Connector */}
            <div className="flex justify-center text-slate-400 font-mono text-xs">
              ↓ [Sub-Millisecond In-Memory Cache Lookup]
            </div>

            {/* 2. Hybrid Classification Layer */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Stage 2: Hybrid AI Diagnostics</span>
                <span className="text-2xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">Circuit-Breaker Guarded</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <p className="font-bold text-slate-900">Rule-Based Deterministic Engine</p>
                  <p className="text-2xs text-slate-500 mt-0.5">Exact gateway code matching (Confidence: 1.0)</p>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <p className="font-bold text-slate-900">Gemini 2.5 Flash Structured JSON</p>
                  <p className="text-2xs text-slate-500 mt-0.5">Ambiguous pattern reasoning + confidence score</p>
                </div>
              </div>
            </div>

            {/* Downward Connector */}
            <div className="flex justify-center text-slate-400 font-mono text-xs">
              ↓ [Confidence &gt;= 0.60 Gate]
            </div>

            {/* 3. Action Execution & Bounded Safeguards */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Stage 3: Targeted Recovery Intervention</span>
                <span className="text-2xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded">Max 3 Retries Invariant</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5">
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs">
                  <p className="font-bold text-emerald-950">1-Click WhatsApp Link</p>
                  <p className="text-2xs text-emerald-700 mt-0.5">Pre-populated UPI/Card cart recovery</p>
                </div>
                <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg text-xs">
                  <p className="font-bold text-purple-950">Salary-Sync Sequencer</p>
                  <p className="text-2xs text-purple-700 mt-0.5">Scheduled for 1st or 5th of month</p>
                </div>
                <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs">
                  <p className="font-bold text-indigo-950">Hinglish Voice AI</p>
                  <p className="text-2xs text-indigo-700 mt-0.5">Outbound call with automated PTP capture</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-2xs text-slate-500 font-mono">Deterministic & Bounded Invariants</span>
          <button
            onClick={onClose}
            className="btn-primary text-xs cursor-pointer"
          >
            Close Flow Graph
          </button>
        </div>


      </div>
    </div>
  );
};

export default PolicyFlowVisualizerModal;

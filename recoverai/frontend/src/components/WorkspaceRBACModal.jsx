import { useState } from 'react';
import { IconX, IconUser, IconShield, IconCheckCircle, IconLayers } from './Icons.jsx';

const TENANTS = [
  { id: 'MER_SWIGGY', name: 'Swiggy Food & Instamart', tier: 'Enterprise Tier-1', activeStream: 'payment_gateway', logoText: 'SW' },
  { id: 'MER_ZOMATO', name: 'Zomato Dining & Delivery', tier: 'Enterprise Tier-1', activeStream: 'checkout_abandonment', logoText: 'ZM' },
  { id: 'MER_FLIPKART', name: 'Flipkart Global Commerce', tier: 'Enterprise Tier-1', activeStream: 'checkout_abandonment', logoText: 'FK' },
  { id: 'MER_NETFLIX', name: 'Netflix Streaming India', tier: 'Subscriptions Plus', activeStream: 'subscription_renewal', logoText: 'NF' },
  { id: 'MER_FRESHWORKS', name: 'Freshworks B2B SaaS', tier: 'B2B Enterprise Net-60', activeStream: 'b2b_invoice', logoText: 'FW' },
];

const ROLES = [
  { id: 'cfo', label: 'Finance CFO / VP Finance', desc: 'Full financial ROI, write-off approvals, and audit dossier signing rights.' },
  { id: 'operator', label: 'Recovery Operations Lead', desc: 'Execution of batch recovery cycles, Hinglish voice dispatch, and PTP agreements.' },
  { id: 'auditor', label: 'Compliance & Risk Auditor', desc: 'Read-only Merkle cryptographic chain verification and invariant compliance view.' },
  { id: 'developer', label: 'Fintech Integration Engineer', desc: 'API key management, webhook debugging, and chaos simulation sandbox.' },
];

const WorkspaceRBACModal = ({ isOpen, onClose, currentTenant, currentRole, onSelectTenant, onSelectRole }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden z-10 animate-fade">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <IconUser className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Access Governance
                </span>
                <span className="text-2xs text-slate-500 font-mono">Multi-Tenant RBAC</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Merchant Workspace & Role Permissions
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
          
          {/* Tenant Selector */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              1. Select Merchant Organization Workspace
            </label>
            <div className="space-y-2">
              {TENANTS.map(t => {
                const isSelected = currentTenant?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTenant(t)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.logoText}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.name}</p>
                        <p className="text-2xs text-slate-500 font-mono">{t.tier} • {t.id}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <IconCheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              2. Switch Active Persona & RBAC Permissions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map(r => {
                const isSelected = currentRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => onSelectRole(r)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{r.label}</span>
                      {isSelected && <IconCheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-2xs text-slate-500 leading-relaxed">{r.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-2xs text-slate-500 font-mono">Scoped Token Active</span>
          <button
            onClick={onClose}
            className="btn-primary text-xs"
          >
            Apply Workspace & Role
          </button>
        </div>

      </div>
    </div>
  );
};

export default WorkspaceRBACModal;

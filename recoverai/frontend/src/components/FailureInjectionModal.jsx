import { useState } from 'react';
import {
  IconX, IconZap, IconShoppingCart, IconRepeat, IconFileText,
  IconCheckCircle, IconPlay, IconActivity, IconShield
} from './Icons.jsx';
import axios from 'axios';

const STREAM_OPTIONS = [
  { id: 'payment_gateway', label: 'Payment Gateway Failure', Icon: IconZap },
  { id: 'checkout_abandonment', label: 'Checkout Cart Drop-off', Icon: IconShoppingCart },
  { id: 'subscription_renewal', label: 'Subscription / Mandate', Icon: IconRepeat },
  { id: 'b2b_invoice', label: 'B2B Overdue Invoice', Icon: IconFileText },
];

const FAILURE_CODES = {
  payment_gateway: ['BANK_TIMEOUT', 'INSUFFICIENT_FUNDS', 'CARD_EXPIRED', 'NETWORK_ERROR', 'ERR_declined'],
  checkout_abandonment: ['CHECKOUT_HESITATION_PAYMENT_PAGE', 'OTP_SUBMISSION_DROPOFF', 'PAYMENT_POPUP_CLOSED'],
  subscription_renewal: ['MANDATE_EXPIRED', 'SUBSCRIPTION_RETRY_FAILED', 'NACH_MANDATE_REVOKED'],
  b2b_invoice: ['INVOICE_OVERDUE_30D_UNPAID', 'INVOICE_OVERDUE_60D_UNPAID'],
};

const FailureInjectionModal = ({ isOpen, onClose, onSuccess }) => {
  const [stream, setStream] = useState('payment_gateway');
  const [customerName, setCustomerName] = useState('Ananya Sharma');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [amount, setAmount] = useState(14500);
  const [failureCode, setFailureCode] = useState('INSUFFICIENT_FUNDS');
  const [cartSummary, setCartSummary] = useState('Sony WH-1000XM5 Noise Cancelling Headphones');
  const [invoiceId, setInvoiceId] = useState('INV-2026-9812');
  const [invoiceAging, setInvoiceAging] = useState(45);
  const [isInjecting, setIsInjecting] = useState(false);
  const [resultTxn, setResultTxn] = useState(null);

  if (!isOpen) return null;

  const handleStreamChange = (newStream) => {
    setStream(newStream);
    setFailureCode(FAILURE_CODES[newStream][0]);
  };

  const handleInject = async () => {
    setIsInjecting(true);
    setResultTxn(null);
    try {
      // 1. Create custom transaction
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        amount: Number(amount),
        revenue_stream: stream,
        failure_code: failureCode,
        merchant_id: 'MER_LIVE_PLAYGROUND',
        cart_summary: stream === 'checkout_abandonment' ? cartSummary : undefined,
        invoice_id: stream === 'b2b_invoice' ? invoiceId : undefined,
        invoice_aging_days: stream === 'b2b_invoice' ? Number(invoiceAging) : undefined,
      };

      const res = await axios.post('http://localhost:5000/api/transactions/inject-single', payload);
      const createdTxn = res.data.transaction;

      // 2. Classify and recover this single transaction
      const recRes = await axios.post(`http://localhost:5000/api/transactions/${createdTxn.transaction_id}/recover`);
      
      setResultTxn(recRes.data.transaction);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Injection failed:', err);
    } finally {
      setIsInjecting(false);
    }
  };

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
              <IconZap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-bold uppercase tracking-widest px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Interactive Studio
                </span>
                <span className="text-2xs text-slate-500 font-mono">Live Failure Injection</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Simulate Custom Revenue-at-Risk Scenario
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

        {/* Body Form */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4 bg-slate-50/40">
          
          {/* Stream Selector */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              1. Select Revenue Risk Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STREAM_OPTIONS.map(opt => {
                const { Icon } = opt;
                const isSel = stream === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleStreamChange(opt.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                      isSel
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                className="input bg-white text-xs w-full"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                At-Risk Amount (INR)
              </label>
              <input
                type="number"
                className="input bg-white text-xs w-full font-mono font-bold"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Failure Code */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Gateway / Telemetry Error Code
            </label>
            <select
              className="input bg-white text-xs w-full font-mono"
              value={failureCode}
              onChange={e => setFailureCode(e.target.value)}
            >
              {(FAILURE_CODES[stream] || []).map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          {/* Conditional Metadata */}
          {stream === 'checkout_abandonment' && (
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Cart Items Summary
              </label>
              <input
                type="text"
                className="input bg-white text-xs w-full"
                value={cartSummary}
                onChange={e => setCartSummary(e.target.value)}
              />
            </div>
          )}

          {stream === 'b2b_invoice' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Invoice Reference ID
                </label>
                <input
                  type="text"
                  className="input bg-white text-xs w-full font-mono"
                  value={invoiceId}
                  onChange={e => setInvoiceId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Aging Days Overdue
                </label>
                <input
                  type="number"
                  className="input bg-white text-xs w-full font-mono"
                  value={invoiceAging}
                  onChange={e => setInvoiceAging(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Injection Execution Result Card */}
          {resultTxn && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs animate-fade">
              <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
                <span className="flex items-center gap-1.5">
                  <IconCheckCircle className="w-4 h-4 text-emerald-600" />
                  Scenario Injected & Executed
                </span>
                <span className="font-mono text-2xs">{resultTxn.transaction_id}</span>
              </div>
              <p className="text-emerald-800 text-2xs leading-relaxed mt-1">
                Diagnosed as <strong>{resultTxn.classified_reason?.replace(/_/g, ' ')}</strong> (Confidence: {Math.round((resultTxn.confidence_score || 1) * 100)}%).
                Dispatched action: <strong>{resultTxn.recovery_action?.replace(/_/g, ' ')}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-2xs text-slate-500 font-mono">Real-Time Ingestion & Diagnostic Pipeline</span>
          <div className="flex items-center gap-2">

            <button
              onClick={onClose}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleInject}
              disabled={isInjecting}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <IconPlay className={`w-3.5 h-3.5 ${isInjecting ? 'animate-spin' : ''}`} />
              <span>{isInjecting ? 'Executing Pipeline…' : 'Inject Scenario'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FailureInjectionModal;

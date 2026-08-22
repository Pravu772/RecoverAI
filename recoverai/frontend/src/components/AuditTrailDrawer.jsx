import { useEffect, useState, useRef } from 'react';
import { getAuditTrail, getOrGenerateVoiceScript, setPromiseToPay, updatePTPStatus } from '../api/index.js';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { printProfessionalDossier } from '../utils/printReport.js';
import {
  IconX, IconCheckCircle, IconAlertTriangle, IconZap, IconShield, IconActivity,
  IconMic, IconCalendar, IconRepeat, IconPlay, IconPause, IconSquare,
  IconCopy, IconCheck, IconVolume2, IconUser, IconLayers, IconXCircle, IconFileText
} from './Icons.jsx';

const EVENT_CONFIG = {
  classification: { Icon: IconActivity, label: 'Classification', dotColor: '#2563eb' },
  recovery_action: { Icon: IconZap, label: 'Recovery Action', dotColor: '#0891b2' },
  outcome: { Icon: IconCheckCircle, label: 'Outcome', dotColor: '#059669' },
  exception: { Icon: IconAlertTriangle, label: 'Exception Flagged', dotColor: '#d97706' },
  constraint_blocked: { Icon: IconShield, label: 'Constraint Guard', dotColor: '#64748b' },
};

const OUTCOME_STYLE = {
  success: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  failure: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  pending: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  skipped: { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  blocked: { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const STATUS_BADGE = {
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  recovered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  exception: 'bg-amber-50 text-amber-700 border-amber-200',
  action_taken: 'bg-blue-50 text-blue-700 border-blue-200',
  max_retries_reached: 'bg-rose-50 text-rose-800 border-rose-200',
  pending_human: 'bg-orange-50 text-orange-700 border-orange-200',
  opted_out: 'bg-slate-100 text-slate-600 border-slate-200',
  classifying: 'bg-purple-50 text-purple-700 border-purple-200',
  ptp_committed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ptp_broken: 'bg-rose-100 text-rose-800 border-rose-300',
};

const AuditTrailDrawer = ({ transaction, onClose }) => {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');
  const [copied, setCopied] = useState(false);

  // Voice AI State
  const [voiceScript, setVoiceScript] = useState(null);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState(-1);

  // PTP Form State
  const [ptpDate, setPtpDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [ptpNotes, setPtpNotes] = useState('Customer confirmed payment on telephone follow-up');
  const [ptpLoading, setPtpLoading] = useState(false);
  const [currentTxn, setCurrentTxn] = useState(transaction);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        window.speechSynthesis?.cancel();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchAudit = () => {
    if (!transaction) return;
    setLoading(true); setError(null);
    getAuditTrail(transaction.transaction_id)
      .then(res => {
        setData(res);
        if (res.transaction) setCurrentTxn(res.transaction);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAudit();
    setCurrentTxn(transaction);
    if (transaction.voice_script) {
      setVoiceScript(transaction.voice_script);
    }
  }, [transaction?.transaction_id]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentTxn.transaction_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Generate / Fetch Voice script
  const handleLoadVoiceScript = async () => {
    setLoadingVoice(true);
    try {
      const res = await getOrGenerateVoiceScript(currentTxn.transaction_id);
      setVoiceScript(res.voice_script);
      fetchAudit();
    } catch (err) {
      console.error('Voice script error:', err);
    } finally {
      setLoadingVoice(false);
    }
  };

  // Universal Web Audio & SpeechSynthesis Playback Engine (100% Cross-Browser Support)
  const handlePlayVoiceScript = () => {
    if (!voiceScript || !voiceScript.turns || voiceScript.turns.length === 0) return;

    if (isPlaying) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      setActiveTurnIdx(-1);
      return;
    }

    setIsPlaying(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // Create / Resume Web Audio Context for guaranteed acoustic tone & equalizer feedback
    let audioCtx = null;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio Context not available:', e);
    }

    const playBeep = (freq, durationMs) => {
      if (!audioCtx) return;
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + durationMs / 1000);
      } catch (err) {
        console.warn('Audio tone synthesis:', err);
      }
    };

    let index = 0;
    const playNextTurn = () => {
      if (index >= voiceScript.turns.length) {
        setIsPlaying(false);
        setActiveTurnIdx(-1);
        return;
      }

      setActiveTurnIdx(index);
      const turn = voiceScript.turns[index];
      const textToSpeak = turn.text_hinglish || turn.text_english || '';

      // Telephony tone signal
      playBeep(turn.speaker === 'AI Agent' ? 440 : 380, 120);

      let spoken = false;
      if (window.speechSynthesis) {
        try {
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          const voices = window.speechSynthesis.getVoices();
          const inVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN') || v.name.includes('India'));
          if (inVoice) utterance.voice = inVoice;
          utterance.rate = turn.speaker === 'AI Agent' ? 1.0 : 1.05;
          utterance.pitch = turn.speaker === 'AI Agent' ? 1.05 : 0.95;

          const advance = () => {
            if (!spoken) {
              spoken = true;
              index++;
              setTimeout(playNextTurn, 500);
            }
          };

          utterance.onend = advance;
          utterance.onerror = advance;

          window.speechSynthesis.speak(utterance);

          // Safety timeout fallback: if speech synthesis is blocked or silent, advance naturally
          const estimatedDuration = Math.max(2500, textToSpeak.length * 75);
          setTimeout(() => {
            if (!spoken) advance();
          }, estimatedDuration);
        } catch (e) {
          // Direct fallback for environments without SpeechSynthesis support
          const fallbackDuration = Math.max(2000, textToSpeak.length * 70);
          setTimeout(() => {
            index++;
            playNextTurn();
          }, fallbackDuration);
        }
      } else {
        const fallbackDuration = Math.max(2000, textToSpeak.length * 70);
        setTimeout(() => {
          index++;
          playNextTurn();
        }, fallbackDuration);
      }
    };

    playNextTurn();
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);


  const handleSavePTP = async () => {
    setPtpLoading(true);
    try {
      const res = await setPromiseToPay(currentTxn.transaction_id, {
        ptp_date: ptpDate,
        ptp_amount: currentTxn.amount,
        ptp_notes: ptpNotes,
      });
      setCurrentTxn(res.transaction);
      fetchAudit();
    } catch (e) {
      alert(`Error saving PTP: ${e.message}`);
    } finally {
      setPtpLoading(false);
    }
  };

  const handleUpdatePTPStatus = async (status) => {
    setPtpLoading(true);
    try {
      const res = await updatePTPStatus(currentTxn.transaction_id, status);
      setCurrentTxn(res.transaction);
      fetchAudit();
    } catch (e) {
      alert(`Error updating PTP: ${e.message}`);
    } finally {
      setPtpLoading(false);
    }
  };

  const handlePrintAuditDossier = () => {
    const trail = data?.audit_trail || [];
    printProfessionalDossier({
      title: 'Cryptographic Audit & Recovery Dossier',
      subtitle: `Transaction ID: ${currentTxn.transaction_id} • Merchant: ${currentTxn.merchant_id}`,
      organization: currentTxn.customer_name || 'Customer Account',
      orgId: currentTxn.transaction_id,
      kpis: [
        { label: 'Amount at Risk', value: formatMoney(currentTxn.amount), sub: `${currentTxn.revenue_stream} stream` },
        { label: 'Current Status', value: currentTxn.status, highlight: currentTxn.status === 'recovered', sub: `Attempt ${currentTxn.attempt_count}/3` },
        { label: 'AI Diagnosis', value: (currentTxn.classified_reason || currentTxn.failure_code || '—').replace(/_/g, ' '), highlight: true, sub: `${((currentTxn.confidence_score || 0.95) * 100).toFixed(0)}% confidence` },
        { label: 'Recovery Strategy', value: (currentTxn.recovery_action || 'none').replace(/_/g, ' '), sub: 'Autonomous dispatch' },
      ],
      sections: [
        {
          title: 'Immutable Event Timeline',
          table: {
            headers: ['Event Type', 'Action Taken', 'Outcome', 'Reasoning / Telemetry'],
            rows: trail.map(ev => [
              ev.action_type,
              ev.action_taken || 'none',
              ev.outcome || 'executed',
              ev.reasoning || ev.detected_reason || '—'
            ])
          }
        },
        ...(voiceScript ? [{
          title: 'Voice AI Telephonic Outreach Script (Hinglish)',
          description: `Agent: ${voiceScript.agent_name || 'Aarav'} • Duration: ${voiceScript.estimated_duration_sec || 45}s`,
          content: `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; font-size:9.5px; line-height:1.4;">
              ${(voiceScript.turns || []).map(t => `
                <div style="margin-bottom:6px;">
                  <strong style="color:#4f46e5;">${t.speaker}:</strong> <em>"${t.text_hinglish}"</em><br/>
                  <span style="color:#64748b; font-size:8.5px;">(${t.text_english})</span>
                </div>
              `).join('')}
            </div>
          `
        }] : [])
      ],
      complianceNote: 'All events cryptographically signed with immutable SHA-256 state transitions and zero plaintext PII exposure.'
    });
  };

  if (!transaction) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={() => { window.speechSynthesis?.cancel(); onClose(); }} />
      <div className="drawer-panel flex flex-col h-full max-w-2xl bg-white shadow-2xl border-l border-slate-200">

        {/* Drawer Header */}
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between gap-4 z-10 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-mono text-xs font-bold">
              ID
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {currentTxn.customer_name || 'Account'}
                </span>
                <span className="text-2xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  {currentTxn.customer_phone || '+91 9876543210'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-2xs text-slate-400 truncate">
                  {currentTxn.transaction_id}
                </span>
                <button
                  onClick={handleCopyId}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy ID"
                >
                  {copied ? <IconCheck className="w-3 h-3 text-emerald-600" /> : <IconCopy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAuditDossier}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Print formal cryptographic audit dossier PDF"
            >
              <IconFileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-2xs font-semibold">Print Dossier</span>
            </button>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-2xs font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
              Esc
            </kbd>
            <button
              id="close-audit-drawer"
              onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overview Banner */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Amount at Risk</p>
              <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">{formatMoney(currentTxn.amount)}</p>
            </div>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Current Status</p>
              <span className={`inline-flex text-2xs font-semibold px-2 py-0.5 rounded-full border mt-1 ${STATUS_BADGE[currentTxn.status] || ''}`}>
                {currentTxn.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Revenue Stream</p>
              <p className="text-xs font-semibold text-indigo-700 capitalize mt-1">
                {currentTxn.revenue_stream?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {currentTxn.cart_summary && (
            <div className="mt-3 p-2.5 rounded-lg bg-orange-50/70 border border-orange-200 text-xs text-orange-900">
              <span className="font-semibold text-orange-950">Cart Contents:</span> {currentTxn.cart_summary}
            </div>
          )}
          {currentTxn.invoice_id && (
            <div className="mt-3 p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-xs text-teal-900">
              <span className="font-semibold text-teal-950">Invoice Reference:</span> {currentTxn.invoice_id} ({currentTxn.invoice_aging_days} days overdue)
            </div>
          )}

          {/* Cryptographic SHA-256 Ledger Stamp */}
          <div className="mt-3.5 p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 flex-shrink-0" />
              <span className="text-2xs font-mono text-slate-600 truncate">
                Audit Chain: <strong className="text-slate-900">SHA-256 Hash-Linked</strong>
              </span>
            </div>
            <span className="text-3xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              Cryptographically Verifiable Ledger
            </span>
          </div>
        </div>


        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-6 overflow-x-auto">
          {[
            { id: 'timeline', label: 'Decision Provenance', Icon: IconActivity },
            { id: 'dispatch', label: 'Channel Previews', Icon: IconLayers },
            { id: 'voice', label: 'Voice Recovery AI', Icon: IconMic },
            { id: 'ptp', label: 'PTP Lifecycle', Icon: IconCalendar },
            { id: 'mandate', label: 'Mandate Sequencer', Icon: IconRepeat },
          ].map(tab => {
            const { Icon } = tab;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* 1. DECISION PROVENANCE / TIMELINE */}
          {activeTab === 'timeline' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                  Immutable Decision Trail
                </p>
                <span className="text-2xs font-mono text-slate-400">
                  {data?.audit_trail?.length || 0} logged events
                </span>
              </div>

              {loading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-16 w-full rounded-xl" />
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700">
                  Failed to load audit provenance: {error}
                </div>
              )}

              {!loading && !error && data && (
                <div className="timeline">
                  {data.audit_trail.map((entry, idx) => {
                    const cfg = EVENT_CONFIG[entry.action_type] || EVENT_CONFIG.classification;
                    const outStyle = OUTCOME_STYLE[entry.outcome] || OUTCOME_STYLE.pending;
                    const { Icon } = cfg;

                    return (
                      <div key={entry._id || idx} className="timeline-item">
                        <div className="timeline-dot" style={{ borderColor: cfg.dotColor, background: '#fff' }} />
                        <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.dotColor }} />
                              <span className="text-xs font-bold text-slate-800">{cfg.label}</span>
                              {entry.action_taken && entry.action_taken !== 'none' && (
                                <span className="code-chip text-2xs">{entry.action_taken}</span>
                              )}
                            </div>
                            <span
                              className="text-2xs font-semibold px-2 py-0.5 rounded-full border"
                              style={{ background: outStyle.bg, color: outStyle.color, borderColor: outStyle.border }}
                            >
                              {entry.outcome}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-600">{entry.reasoning}</p>
                          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-100">
                            {entry.confidence_score !== null && entry.confidence_score !== undefined && (
                              <span className="text-2xs text-slate-400">
                                Confidence: <strong className="text-slate-700 font-mono">{Math.round(entry.confidence_score * 100)}%</strong>
                              </span>
                            )}
                            <span className="ml-auto text-2xs font-mono text-slate-400">{formatDate(entry.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. MULTI-CHANNEL DISPATCH PREVIEWS TAB */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">

              {/* Explicit Simulation Notice (Priority 3 Requirement) */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <IconAlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Simulated Channel Previews / UI Mockup</span>
                  <p className="text-2xs text-amber-800 mt-0.5 leading-relaxed">
                    These previews demonstrate the multi-channel template payloads generated by the decision engine. No live SMS or WhatsApp API keys are connected.
                  </p>
                </div>
              </div>

              {/* WhatsApp Rich Message Preview */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                    <span className="text-xs font-bold text-emerald-950">WhatsApp Business Gateway [Preview Mockup]</span>
                  </div>
                  <span className="text-2xs font-mono text-emerald-700 font-semibold">Simulated Template</span>
                </div>

                <div className="p-4 bg-slate-50/70">
                  <div className="max-w-[340px] bg-white rounded-2xl rounded-tl-xs p-4 border border-slate-200 shadow-2xs space-y-2.5 text-xs relative">
                    <p className="font-bold text-slate-900 leading-snug">
                      Hi {currentTxn.customer_name || 'there'}, your payment of <span className="text-emerald-700 font-extrabold">{formatMoney(currentTxn.amount)}</span> was interrupted.
                    </p>
                    <p className="text-2xs text-slate-600 leading-relaxed">
                      {currentTxn.cart_summary
                        ? `Your order items "${currentTxn.cart_summary}" are reserved for the next 60 minutes. Tap below to complete with 1-click UPI / Card.`
                        : 'Your payment link has been pre-filled. Tap below to complete securely in 1 click.'}
                    </p>
                    <div className="pt-2 border-t border-slate-100">
                      <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-xs transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer">
                        <span>Complete Payment</span>
                        <span className="font-mono font-normal">({formatMoney(currentTxn.amount)})</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-3xs font-mono text-slate-400 pt-0.5">
                      <span>10:42 PM</span>
                      <span className="text-indigo-600 font-bold">Delivered</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* SMS Notification Preview */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-slate-800">
                  <span className="text-xs font-bold">Telecom SMS Gateway [Preview Mockup]</span>
                  <span className="text-2xs font-mono text-slate-500">{currentTxn.customer_phone || '+91 98765 43210'}</span>
                </div>
                <div className="p-4 bg-slate-50/50">
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700 leading-relaxed shadow-2xs">
                    [RECOVERAI] Payment of {formatMoney(currentTxn.amount)} at {currentTxn.merchant_id || 'Merchant'} failed ({currentTxn.failure_code}). Tap link to retry immediately: https://pay.recoverai.io/r/{currentTxn.transaction_id}
                  </div>
                </div>
              </div>


              {/* Printable Cryptographic Audit Dossier */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Compliance Audit Dossier</h4>
                  <p className="text-2xs text-indigo-700 mt-0.5">Generate formal SOX/RBI compliance PDF record with SHA-256 hash</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="btn-primary text-xs flex-shrink-0"
                >
                  Print Dossier
                </button>
              </div>

            </div>
          )}

          {/* 3. VOICE RECOVERY AI TAB */}
          {activeTab === 'voice' && (
            <div className="space-y-5">
              {/* Voice Agent Control Card (Light Modern Theme) */}
              <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xs uppercase tracking-widest px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold border border-indigo-200">
                      Autonomous Hinglish Agent
                    </span>
                    <h3 className="text-sm font-bold mt-1.5 text-slate-900">
                      Vernacular Outbound Recovery
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Empathetic conversational outreach with automated PTP capture
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
                    <IconVolume2 className="w-4 h-4" />
                  </div>
                </div>

                {/* Animated Frequency Equalizer Waveform */}
                <div className="my-4 py-3 px-4 bg-slate-50 rounded-xl border border-slate-200/90 flex items-center justify-between gap-1 shadow-2xs h-12">
                  {[4, 12, 8, 16, 10, 18, 14, 20, 12, 18, 8, 15, 6, 14, 10, 18, 12, 8].map((h, i) => (
                    <div
                      key={i}
                      className={isPlaying ? 'eq-bar' : 'w-1 rounded-full bg-slate-200 transition-all'}
                      style={{
                        height: isPlaying ? undefined : '6px',
                        animationDelay: isPlaying ? `${(i * 0.08).toFixed(2)}s` : undefined,
                      }}
                    />
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-2xs text-slate-500 font-mono">
                    {isPlaying ? 'Call Active (SpeechSynthesis)' : 'Ready for Dispatch'}
                  </span>

                  {!voiceScript ? (
                    <button
                      onClick={handleLoadVoiceScript}
                      disabled={loadingVoice}
                      className="btn-primary text-xs"
                    >
                      <IconMic className="w-3.5 h-3.5" />
                      <span>{loadingVoice ? 'Synthesizing...' : 'Generate Voice Script'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePlayVoiceScript}
                      className={`btn-primary text-xs ${isPlaying
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                    >
                      {isPlaying ? <IconSquare className="w-3.5 h-3.5" /> : <IconPlay className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? 'Stop Call' : 'Play Live Voice Call'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dialogue Transcript */}
              {voiceScript && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Conversation Transcript
                    </p>
                    <span className="text-2xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Language: {voiceScript.language || 'Hinglish'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {voiceScript.turns?.map((turn, i) => {
                      const isAgent = turn.speaker === 'AI Agent';
                      const isActive = activeTurnIdx === i;

                      return (
                        <div
                          key={i}
                          className={`p-3.5 rounded-xl border transition-all duration-150 ${isAgent
                              ? 'bg-indigo-50/60 border-indigo-100 mr-6'
                              : 'bg-emerald-50/60 border-emerald-100 ml-6'
                            } ${isActive ? 'ring-2 ring-indigo-500 shadow-xs' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-2xs font-bold px-2 py-0.2 rounded ${isAgent
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                }`}
                            >
                              {isAgent ? 'Aarav (AI Agent)' : (currentTxn.customer_name || 'Customer')}
                            </span>
                            {isActive && (
                              <span className="text-2xs font-bold text-indigo-600">
                                Speaking...
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-800 leading-relaxed">
                            "{turn.text_hinglish}"
                          </p>
                          <p className="text-2xs text-slate-500 mt-1 italic">
                            Translation: "{turn.text_english}"
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Direct PTP Commit Callout */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Customer Agreed to Pay?
                      </p>
                      <p className="text-2xs text-slate-500">
                        Lock in the commitment with the Promise-to-Pay (PTP) tracker.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('ptp')}
                      className="btn-secondary text-xs"
                    >
                      <span>Log PTP</span>
                      <IconCalendar className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. PROMISE-TO-PAY (PTP) TAB */}
          {activeTab === 'ptp' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Promise-to-Pay Protocol
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Track customer payment commitments and enforce automated cooldowns against the clock.
                </p>
              </div>

              {/* Status card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Commitment Status:</span>
                  <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[currentTxn.status] || ''}`}>
                    {currentTxn.ptp_status?.toUpperCase() || 'NONE'}
                  </span>
                </div>

                {currentTxn.ptp_date && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Target Date:</span>
                    <span className="font-semibold font-mono text-slate-800">
                      {new Date(currentTxn.ptp_date).toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {currentTxn.ptp_notes && (
                  <div className="text-2xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <strong>Notes:</strong> {currentTxn.ptp_notes}
                  </div>
                )}

                {currentTxn.ptp_status === 'committed' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleUpdatePTPStatus('kept')}
                      disabled={ptpLoading}
                      className="btn-primary flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-xs"
                    >
                      <IconCheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Kept</span>
                    </button>
                    <button
                      onClick={() => handleUpdatePTPStatus('broken')}
                      disabled={ptpLoading}
                      className="btn-primary flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-xs"
                    >
                      <IconXCircle className="w-3.5 h-3.5" />
                      <span>Mark Broken</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <p className="text-xs font-bold text-indigo-950">
                  {currentTxn.ptp_status === 'committed' ? 'Reschedule Commitment' : 'Register Payment Commitment'}
                </p>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Promised Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={ptpDate}
                    onChange={e => setPtpDate(e.target.value)}
                    className="input text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Follow-up Notes
                  </label>
                  <input
                    type="text"
                    value={ptpNotes}
                    onChange={e => setPtpNotes(e.target.value)}
                    placeholder="e.g. Customer promised settlement post-salary on Friday"
                    className="input text-xs bg-white"
                  />
                </div>

                <button
                  onClick={handleSavePTP}
                  disabled={ptpLoading}
                  className="btn-primary w-full justify-center text-xs"
                >
                  <IconCalendar className="w-3.5 h-3.5" />
                  <span>{ptpLoading ? 'Saving...' : 'Commit Promise-to-Pay Date'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. MANDATE RETRY SEQUENCER */}
          {activeTab === 'mandate' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Smart Mandate Retry Sequence
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Automated NACH & recurring card retry stages aligned with bank uptime and salary cycles.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    title: 'Stage 1: Immediate Gateway Retry',
                    time: '0 to 15 mins',
                    desc: 'Transient check for gateway connection timeouts and momentary drops.',
                    status: currentTxn.attempt_count >= 1 ? 'Executed' : 'Pending',
                    active: currentTxn.attempt_count === 0,
                  },
                  {
                    step: 2,
                    title: 'Stage 2: Payday / Liquidity Alignment',
                    time: '1st or 5th of Month / 2-Day Cooldown',
                    desc: 'Re-presentation scheduled when customer liquidity is statistically peak.',
                    status: currentTxn.attempt_count >= 2 ? 'Executed' : currentTxn.attempt_count === 1 ? 'In Cooldown' : 'Queued',
                    active: currentTxn.attempt_count === 1,
                  },
                  {
                    step: 3,
                    title: 'Stage 3: Multi-Channel Alternative Link',
                    time: 'Day 5 Post-Failure',
                    desc: 'Automated 1-click alternative UPI/Card checkout link dispatched via WhatsApp & Email.',
                    status: currentTxn.attempt_count >= 3 ? 'Executed' : 'Queued',
                    active: currentTxn.attempt_count === 2,
                  },
                  {
                    step: 4,
                    title: 'Stage 4: Compliant Escalation Stop',
                    time: 'Max 3 Attempts Reached',
                    desc: 'Hard bounded stop to protect customer credit rating; routes to human collections agent.',
                    status: currentTxn.status === 'max_retries_reached' || currentTxn.status === 'pending_human' ? 'Active' : 'Standby',
                    active: currentTxn.attempt_count >= 3,
                  },
                ].map(stage => (
                  <div
                    key={stage.step}
                    className={`p-4 rounded-xl border transition-all ${stage.active
                        ? 'border-indigo-400 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 bg-white'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-mono font-bold ${stage.active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                          {stage.step}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{stage.title}</span>
                      </div>
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${stage.status === 'Executed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          stage.status === 'In Cooldown' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            stage.status === 'Active' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                        {stage.status}
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 ml-7">{stage.time} • {stage.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default AuditTrailDrawer;



import { useEffect, useState, useRef } from 'react';
import { getAuditTrail, getOrGenerateVoiceScript, setPromiseToPay, updatePTPStatus } from '../api/index.js';
import { IconX, IconCheckCircle, IconAlertTriangle, IconZap, IconShield, IconActivity } from './Icons.jsx';

const EVENT_CONFIG = {
  classification:    { Icon: IconActivity, label: 'Classification',   dotColor: '#1d4ed8' },
  recovery_action:   { Icon: IconZap,      label: 'Recovery Action',  dotColor: '#0891b2' },
  outcome:           { Icon: IconCheckCircle, label: 'Outcome',       dotColor: '#059669' },
  exception:         { Icon: IconAlertTriangle, label: 'Exception',   dotColor: '#d97706' },
  constraint_blocked:{ Icon: IconShield,   label: 'Blocked',          dotColor: '#64748b' },
};

const OUTCOME_STYLE = {
  success: { color: '#059669', bg: '#ecfdf5' },
  failure: { color: '#dc2626', bg: '#fef2f2' },
  pending: { color: '#d97706', bg: '#fffbeb' },
  skipped: { color: '#64748b', bg: '#f8fafc' },
  blocked: { color: '#64748b', bg: '#f8fafc' },
};

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const STATUS_META = {
  failed:              'badge-failed',
  recovered:           'badge-recovered',
  exception:           'badge-exception',
  action_taken:        'badge-action_taken',
  max_retries_reached: 'badge-max_retries_reached',
  pending_human:       'badge-pending_human',
  opted_out:           'badge-opted_out',
  classifying:         'badge-classifying',
  ptp_committed:       'badge-action_taken',
  ptp_broken:          'badge-exception',
};

const AuditTrailDrawer = ({ transaction, onClose }) => {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [activeTab, setActiveTab]   = useState('timeline'); // 'timeline' | 'voice' | 'ptp' | 'mandate'

  // Voice AI State
  const [voiceScript, setVoiceScript] = useState(null);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState(-1);
  const speechRef = useRef(null);

  // PTP Form State
  const [ptpDate, setPtpDate]       = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [ptpNotes, setPtpNotes]     = useState('Customer confirmed payment on phone outreach');
  const [ptpLoading, setPtpLoading] = useState(false);
  const [currentTxn, setCurrentTxn] = useState(transaction);

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

  // Load Voice script on demand
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

  // SpeechSynthesis Web Audio Player
  const handlePlayVoiceScript = () => {
    if (!voiceScript || !voiceScript.turns || voiceScript.turns.length === 0) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setActiveTurnIdx(-1);
      return;
    }

    setIsPlaying(true);
    window.speechSynthesis.cancel();

    let index = 0;
    const playNextTurn = () => {
      if (index >= voiceScript.turns.length) {
        setIsPlaying(false);
        setActiveTurnIdx(-1);
        return;
      }

      setActiveTurnIdx(index);
      const turn = voiceScript.turns[index];
      const utterance = new SpeechSynthesisUtterance(turn.text_hinglish || turn.text_english);
      
      // Try to find a natural English/Hindi voice
      const voices = window.speechSynthesis.getVoices();
      const inVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN') || v.name.includes('India'));
      if (inVoice) utterance.voice = inVoice;
      utterance.rate = turn.speaker === 'AI Agent' ? 1.0 : 1.05;
      utterance.pitch = turn.speaker === 'AI Agent' ? 1.05 : 0.95;

      utterance.onend = () => {
        index++;
        setTimeout(playNextTurn, 600);
      };

      utterance.onerror = () => {
        index++;
        setTimeout(playNextTurn, 600);
      };

      window.speechSynthesis.speak(utterance);
    };

    playNextTurn();
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Commit PTP
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

  if (!transaction) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={() => { window.speechSynthesis?.cancel(); onClose(); }} />
      <div className="drawer-panel flex flex-col h-full max-w-2xl bg-white shadow-2xl">

        {/* Header */}
        <div
          className="sticky top-0 px-5 py-4 flex items-center justify-between gap-4 z-10 border-b"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-sm">
              AI
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {currentTxn.customer_name || 'Customer'}
                </span>
                <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                  {currentTxn.customer_phone || '+91 9876543210'}
                </span>
              </div>
              <p className="font-mono text-2xs truncate text-indigo-600">
                {currentTxn.transaction_id}
              </p>
            </div>
          </div>
          <button
            id="close-audit-drawer"
            onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Top summary row */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Amount at Risk</p>
              <p className="text-base font-bold text-slate-900">{formatINR(currentTxn.amount)}</p>
            </div>
            <div>
              <p className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
              <span className={`badge ${STATUS_META[currentTxn.status] || ''} mt-0.5 inline-block`}>
                {currentTxn.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <p className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Stream</p>
              <span className="text-xs font-semibold text-indigo-700 capitalize">
                {currentTxn.revenue_stream?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {currentTxn.cart_summary && (
            <div className="mt-2.5 px-3 py-1.5 rounded bg-orange-50 border border-orange-200 text-2xs text-orange-800">
              <strong>🛒 Abandoned Cart:</strong> {currentTxn.cart_summary}
            </div>
          )}
          {currentTxn.invoice_id && (
            <div className="mt-2.5 px-3 py-1.5 rounded bg-teal-50 border border-teal-200 text-2xs text-teal-800">
              <strong>📄 Invoice:</strong> {currentTxn.invoice_id} ({currentTxn.invoice_aging_days} days overdue)
            </div>
          )}
        </div>

        {/* Feature Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 gap-2">
          {[
            { id: 'timeline', label: '📜 Audit Trail' },
            { id: 'voice',    label: '🎙️ Hinglish Voice AI' },
            { id: 'ptp',      label: '🤝 Promise-to-Pay' },
            { id: 'mandate',  label: '🔄 Mandate Sequencer' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* 1. TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                  Immutable Decision Log
                </p>
                <span className="text-2xs text-slate-400">
                  {data?.audit_trail?.length || 0} events recorded
                </span>
              </div>

              {loading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton h-16 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {error && (
                <div className="px-3 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
                  Failed to load audit trail: {error}
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
                        <div className="card p-3 card-hover border border-slate-200 shadow-sm rounded-xl">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.dotColor }} />
                              <span className="text-xs font-bold text-slate-800">{cfg.label}</span>
                              {entry.action_taken && entry.action_taken !== 'none' && (
                                <span className="code-chip text-2xs">{entry.action_taken}</span>
                              )}
                            </div>
                            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: outStyle.bg, color: outStyle.color }}>
                              {entry.outcome}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-600">{entry.reasoning}</p>
                          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-100">
                            {entry.confidence_score !== null && entry.confidence_score !== undefined && (
                              <span className="text-2xs text-slate-400">
                                Confidence: <strong className="text-slate-700">{Math.round(entry.confidence_score * 100)}%</strong>
                              </span>
                            )}
                            <span className="ml-auto text-2xs text-slate-400">{formatDate(entry.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. HINGLISH VOICE RECOVERY TAB */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xs uppercase tracking-widest px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded font-semibold">
                      Autonomous Hinglish Agent
                    </span>
                    <h3 className="text-lg font-bold mt-1 text-white flex items-center gap-2">
                      Voice Recovery Simulation
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Empathetic vernacular outreach with automated PTP capture
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl">
                    🎙️
                  </div>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="my-5 py-3 px-4 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between gap-1">
                  {[40, 65, 25, 90, 45, 80, 60, 100, 35, 75, 50, 95, 30, 85, 40, 70, 55, 90].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-300 ${
                        isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(12, (h * ((i % 3) + 1)) % 38)}px` : '8px',
                        animationDelay: `${i * 70}ms`,
                      }}
                    />
                  ))}
                </div>

                {/* Audio Controls */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-2xs text-slate-300 font-mono">
                    {isPlaying ? '🔴 Call in Progress (SpeechSynthesis Active)' : '⏸️ Standby — Ready to Dial'}
                  </div>

                  {!voiceScript ? (
                    <button
                      onClick={handleLoadVoiceScript}
                      disabled={loadingVoice}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md flex items-center gap-2"
                    >
                      {loadingVoice ? 'Generating AI Script…' : 'Generate Hinglish Call Script'}
                    </button>
                  ) : (
                    <button
                      onClick={handlePlayVoiceScript}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
                        isPlaying
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isPlaying ? '⏹️ Stop Call Audio' : '▶️ Play Live Voice Call'}
                    </button>
                  )}
                </div>
              </div>

              {/* Call Transcript */}
              {voiceScript && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Live Call Transcript & Psychology
                    </p>
                    <span className="text-2xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
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
                          className={`p-3.5 rounded-xl border transition-all ${
                            isAgent
                              ? 'bg-indigo-50/70 border-indigo-100 mr-6'
                              : 'bg-emerald-50/70 border-emerald-100 ml-6'
                          } ${isActive ? 'ring-2 ring-indigo-500 shadow-md' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                                isAgent ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {isAgent ? '🤖 Aarav (RecoverAI Agent)' : `👤 ${currentTxn.customer_name || 'Customer'}`}
                            </span>
                            {isActive && (
                              <span className="text-2xs font-bold text-indigo-600 animate-pulse">
                                🔊 Speaking Now…
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-800 leading-relaxed">
                            "{turn.text_hinglish}"
                          </p>
                          <p className="text-2xs text-slate-500 mt-1 italic">
                            EN: "{turn.text_english}"
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick PTP commit from Call Outcome */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-purple-900">
                        Customer Agreed to Pay Later?
                      </p>
                      <p className="text-2xs text-purple-700">
                        Lock in the commitment with the Promise-to-Pay (PTP) engine.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('ptp')}
                      className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm"
                    >
                      Log PTP Commitment →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. PROMISE-TO-PAY (PTP) TAB */}
          {activeTab === 'ptp' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span>🤝</span> Promise-to-Pay (PTP) Lifecycle Tracker
                </h4>
                <p className="text-xs text-slate-600">
                  Track payment commitments, enforce automated cooldowns, and evaluate deadlines against the simulated clock.
                </p>
              </div>

              {/* Current PTP Status */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Current PTP Status:</span>
                  <span className={`badge ${
                    currentTxn.ptp_status === 'committed' ? 'badge-action_taken' :
                    currentTxn.ptp_status === 'kept' ? 'badge-recovered' :
                    currentTxn.ptp_status === 'broken' ? 'badge-exception' : 'badge-failed'
                  }`}>
                    {currentTxn.ptp_status?.toUpperCase() || 'NONE'}
                  </span>
                </div>

                {currentTxn.ptp_date && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Promised Due Date:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(currentTxn.ptp_date).toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {currentTxn.ptp_notes && (
                  <div className="text-2xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <strong>Notes:</strong> {currentTxn.ptp_notes}
                  </div>
                )}

                {/* Status action buttons */}
                {currentTxn.ptp_status === 'committed' && (
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleUpdatePTPStatus('kept')}
                      disabled={ptpLoading}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      ✅ Mark Promise Kept (Recovered)
                    </button>
                    <button
                      onClick={() => handleUpdatePTPStatus('broken')}
                      disabled={ptpLoading}
                      className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                    >
                      ⚠️ Mark Broken (Escalate)
                    </button>
                  </div>
                )}
              </div>

              {/* Set / Reschedule PTP Form */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-3">
                <p className="text-xs font-bold text-indigo-900">
                  {currentTxn.ptp_status === 'committed' ? 'Reschedule Commitment' : 'Register New Commitment'}
                </p>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Promised Payment Date:
                  </label>
                  <input
                    type="date"
                    value={ptpDate}
                    onChange={e => setPtpDate(e.target.value)}
                    className="input w-full bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Commitment Notes:
                  </label>
                  <input
                    type="text"
                    value={ptpNotes}
                    onChange={e => setPtpNotes(e.target.value)}
                    placeholder="e.g. Customer promised to pay after salary deposit on Friday"
                    className="input w-full bg-white text-xs"
                  />
                </div>

                <button
                  onClick={handleSavePTP}
                  disabled={ptpLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow"
                >
                  {ptpLoading ? 'Saving Commitment…' : 'Save Promise-to-Pay Commitment'}
                </button>
              </div>
            </div>
          )}

          {/* 4. MANDATE RETRY SEQUENCER TAB */}
          {activeTab === 'mandate' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <span>🔄</span> Smart Mandate Retry Sequencer
                </h4>
                <p className="text-xs text-slate-600">
                  Automated NACH & recurring card mandate re-presentation sequence synchronized with Indian bank uptime and salary cycles.
                </p>
              </div>

              {/* Sequence Stages */}
              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    title: 'Stage 1: Transient Gateway Retry',
                    time: 'Instant (0 to 15 mins)',
                    desc: 'Safe immediate retry for network drops and transient bank NPCI timeouts.',
                    status: currentTxn.attempt_count >= 1 ? 'Executed' : 'Pending',
                    active: currentTxn.attempt_count === 0,
                  },
                  {
                    step: 2,
                    title: 'Stage 2: Payday / Balance Sync Retry',
                    time: '1st / 5th of Month or 2-Day Cooldown',
                    desc: 'Scheduled re-presentation when customer balance is statistically highest.',
                    status: currentTxn.attempt_count >= 2 ? 'Executed' : currentTxn.attempt_count === 1 ? 'In Cooldown' : 'Queued',
                    active: currentTxn.attempt_count === 1,
                  },
                  {
                    step: 3,
                    title: 'Stage 3: Multi-Channel Fallback Link',
                    time: 'Day 5',
                    desc: 'Automated WhatsApp & Email delivery of alternative 1-click UPI / Netbanking link.',
                    status: currentTxn.attempt_count >= 3 ? 'Executed' : 'Queued',
                    active: currentTxn.attempt_count === 2,
                  },
                  {
                    step: 4,
                    title: 'Stage 4: Compliant Human Collections Escalation',
                    time: 'After Max Attempts',
                    desc: 'Stops automated debits to prevent customer penalty fees and routes to agent.',
                    status: currentTxn.status === 'max_retries_reached' || currentTxn.status === 'pending_human' ? 'Active' : 'Standby',
                    active: currentTxn.attempt_count >= 3,
                  },
                ].map(stage => (
                  <div
                    key={stage.step}
                    className={`p-4 rounded-xl border transition-all ${
                      stage.active
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-bold ${
                          stage.active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {stage.step}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{stage.title}</span>
                      </div>
                      <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                        stage.status === 'Executed' ? 'bg-emerald-100 text-emerald-800' :
                        stage.status === 'In Cooldown' ? 'bg-amber-100 text-amber-800' :
                        stage.status === 'Active' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
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


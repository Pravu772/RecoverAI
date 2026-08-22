const auditService = require('./auditService');
const { isAlreadyExecuted, markExecuted } = require('../utils/idempotency');
const { getSimulatedNow } = require('../utils/scheduler');
const { getGeminiModel } = require('../config/gemini');

// FIX #9 — PII masking for console/log output (DPDP Act / GDPR compliance)
// Full PII is only stored in the encrypted audit DB, never in plaintext logs.
const maskName   = (n = '') => n.split(' ').map((w, i) => i === 0 ? (w[0] || '?') + '***' : w[0] + '**').join(' ');
const maskAmount = (a)      => `₹${String(Math.round(a)).slice(0, -2)}**`;

/**
 * Recovery Decision Engine
 *
 * Maps classified failure reasons & streams to bounded recovery actions:
 *   - Insufficient funds (low amount)  → scheduled_retry_2days
 *   - Insufficient funds (high amount) → hinglish_voice_call
 *   - Card expired                     → email_alt_payment
 *   - Bank timeout / Network error     → immediate_retry
 *   - Mandate expired / Subscription   → smart_payday_retry (synced to 1st/5th)
 *   - Checkout drop-off / Hesitation   → whatsapp_checkout_link
 *   - B2B Overdue Invoice              → b2b_dunning_escalation / hinglish_voice_call
 *   - Ambiguous / High Risk            → escalate_human
 */

const RECOVERY_ACTION_MAP = {
  insufficient_funds: 'scheduled_retry_2days',
  card_expired: 'email_alt_payment',
  bank_timeout: 'immediate_retry',
  mandate_expired: 'smart_payday_retry',
  subscription_failed_billing: 'smart_payday_retry',
  network_error: 'immediate_retry',
  checkout_hesitation: 'whatsapp_checkout_link',
  otp_dropoff: 'whatsapp_checkout_link',
  invoice_overdue_30d: 'b2b_dunning_escalation',
  invoice_overdue_60d: 'hinglish_voice_call',
  unknown: 'escalate_human',
};

const SUCCESS_RATES = {
  immediate_retry: 0.45,
  scheduled_retry_2days: 0.55,
  smart_payday_retry: 0.65,
  sms_nudge: 0.35,
  email_alt_payment: 0.50,
  whatsapp_checkout_link: 0.60,
  b2b_dunning_escalation: 0.40,
  hinglish_voice_call: 0.70, // High recovery rate with polite AI conversational nudge
  escalate_human: null,
};

const MAX_ATTEMPTS = 3;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Determines the recovery action for a transaction.
 */
const selectRecoveryAction = (transaction) => {
  // If high-value (> ₹5,000) B2C or B2B 60d overdue, prioritize Hinglish voice recovery
  if (transaction.amount >= 7500 && ['insufficient_funds', 'checkout_hesitation'].includes(transaction.classified_reason)) {
    return 'hinglish_voice_call';
  }
  return RECOVERY_ACTION_MAP[transaction.classified_reason] || 'escalate_human';
};

/**
 * Generates a realistic, turn-by-turn Hinglish Voice Recovery Script using Gemini or fallback.
 */
const generateVoiceScript = async (transaction, options = {}) => {
  const customerName = transaction.customer_name || 'Customer';
  const amount = transaction.amount;
  const merchant = (transaction.merchant_id || 'Merchant').replace('MER_', '');
  const reason = transaction.classified_reason || 'payment issue';

  // Fast template for batch operations to prevent blocking
  if (options.fastTemplate) {
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    return {
      agent_name: "Aarav (RecoverAI Voice Agent)",
      language: "Hinglish",
      estimated_duration_sec: 40,
      summary: `Polite outreach to ${customerName} regarding ₹${amount} ${merchant} transaction with PTP commitment agreement.`,
      suggested_ptp_date: in3Days,
      turns: [
        {
          speaker: "AI Agent",
          text_hinglish: `Namaste ${customerName} ji! Main ${merchant} billing recovery team se Aarav baat kar raha hoon. Kya aap 1 minute baat kar sakte hain?`,
          text_english: `Hello ${customerName}! This is Aarav from the ${merchant} billing recovery team. Do you have 1 minute to speak?`
        },
        {
          speaker: "Customer",
          text_hinglish: `Haan boliye, mera ₹${amount} ka payment fail ho gaya tha subah.`,
          text_english: `Yes tell me, my payment of ₹${amount} failed in the morning.`
        },
        {
          speaker: "AI Agent",
          text_hinglish: `Ji bilkul, bank network glitch ki wajah se hua tha. Maine aapke phone par ek direct Razorpay/UPI payment link bhej diya hai jisme zero transaction fee hai.`,
          text_english: `Yes, it happened due to a bank network glitch. I have sent a direct zero-fee payment link to your phone.`
        },
        {
          speaker: "Customer",
          text_hinglish: `Thank you Aarav, main aaj shaam ko link open karke payment complete kar deta hoon.`,
          text_english: `Thank you Aarav, I will open the link this evening and complete the payment.`
        }
      ]
    };
  }

  const model = getGeminiModel();
  if (model) {
    try {
      const prompt = `
You are an AI Voice Agent named "Aarav" calling a valued customer from an Indian fintech / merchant platform.
Customer Name: ${customerName}
Merchant: ${merchant}
Amount: ₹${amount}
Reason: ${reason} (Stream: ${transaction.revenue_stream})

Write a polite, engaging, 3-turn Hinglish (Hindi + English blend) phone recovery call script.
Format output as strict JSON:
{
  "agent_name": "Aarav (RecoverAI Voice Agent)",
  "language": "Hinglish",
  "estimated_duration_sec": 45,
  "summary": "<1 sentence summary of conversation>",
  "suggested_ptp_date": "<ISO Date 3 days from now>",
  "turns": [
    {
      "speaker": "AI Agent",
      "text_hinglish": "Namaste ${customerName} ji! Main ${merchant} support se Aarav bol raha hoon. Kya main aapke ₹${amount} ke payment update ke baare mein 1 minute baat kar sakta hoon?",
      "text_english": "Hello ${customerName}! This is Aarav from ${merchant} support. May I speak with you for 1 minute regarding your ₹${amount} payment update?"
    },
    {
      "speaker": "Customer",
      "text_hinglish": "Haan boliye, kya hua? Maine try kiya tha but timeout ho gaya tha shayad.",
      "text_english": "Yes tell me, what happened? I tried earlier but it probably timed out."
    },
    {
      "speaker": "AI Agent",
      "text_hinglish": "Ji bilkul samajh sakta hoon. Humne aapke WhatsApp par ek secure 1-click UPI recovery link share kiya hai. Kya aap aaj sham tak complete kar lenge ya koi specific time schedule karein?",
      "text_english": "I completely understand. We've sent a secure 1-click UPI recovery link on your WhatsApp. Will you be able to complete it by this evening?"
    },
    {
      "speaker": "Customer",
      "text_hinglish": "Haan main office se nikal ke 7 baje tak pay kar dunga, pakka.",
      "text_english": "Yes I will definitely pay by 7 PM once I leave office."
    }
  ]
}
`.trim();

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text);
    } catch (err) {
      console.warn('[recoveryService] Gemini voice script fallback:', err.message,
        `| customer=${maskName(customerName)} amount=${maskAmount(amount)}`);
    }
  }

  // Realistic Fallback Hinglish Voice Script
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  return {
    agent_name: "Aarav (RecoverAI Voice Agent)",
    language: "Hinglish",
    estimated_duration_sec: 40,
    summary: `Polite outreach to ${customerName} regarding ₹${amount} ${merchant} transaction with PTP commitment agreement.`,
    suggested_ptp_date: in3Days,
    turns: [
      {
        speaker: "AI Agent",
        text_hinglish: `Namaste ${customerName} ji! Main ${merchant} billing recovery team se Aarav baat kar raha hoon. Kya aap 1 minute baat kar sakte hain?`,
        text_english: `Hello ${customerName}! This is Aarav from the ${merchant} billing recovery team. Do you have 1 minute to speak?`
      },
      {
        speaker: "Customer",
        text_hinglish: `Haan boliye, mera ₹${amount} ka payment fail ho gaya tha subah.`,
        text_english: `Yes tell me, my payment of ₹${amount} failed in the morning.`
      },
      {
        speaker: "AI Agent",
        text_hinglish: `Ji bilkul, bank network glitch ki wajah se hua tha. Maine aapke phone par ek direct Razorpay/UPI payment link bhej diya hai jisme zero transaction fee hai.`,
        text_english: `Yes, it happened due to a bank network glitch. I have sent a direct zero-fee payment link to your phone.`
      },
      {
        speaker: "Customer",
        text_hinglish: `Thank you Aarav, main aaj shaam ko link open karke payment complete kar deta hoon.`,
        text_english: `Thank you Aarav, I will open the link this evening and complete the payment.`
      }
    ]
  };
};

/**
 * Executes the recovery flow for a single transaction.
 */
const executeRecovery = async (transaction, options = {}) => {
  const txnId = transaction.transaction_id;
  const now = getSimulatedNow();

  // CONSTRAINT 1: Opt-out guard
  if (transaction.opted_out) {
    const reasoning = `Recovery blocked: Customer ${transaction.customer_name} (${transaction.customer_id}) has opted out of all recovery communications.`;

    await auditService.log({
      transaction_id: txnId,
      action_type: 'constraint_blocked',
      detected_reason: transaction.classified_reason,
      confidence_score: transaction.confidence_score,
      action_taken: 'none',
      reasoning,
      outcome: 'blocked',
      amount: transaction.amount,
      meta: { constraint: 'opted_out' },
    });

    return {
      success: false,
      new_status: 'opted_out',
      action_taken: 'none',
      reasoning,
      simulated_outcome: null,
    };
  }

  // CONSTRAINT 2: Max retries check
  if (transaction.attempt_count >= MAX_ATTEMPTS) {
    const reasoning = `Recovery blocked: Transaction ${txnId} reached hard limit of ${MAX_ATTEMPTS} attempts. Escalate to human specialist.`;

    await auditService.log({
      transaction_id: txnId,
      action_type: 'constraint_blocked',
      detected_reason: transaction.classified_reason,
      confidence_score: transaction.confidence_score,
      action_taken: 'none',
      reasoning,
      outcome: 'blocked',
      amount: transaction.amount,
      meta: { constraint: 'max_retries', attempt_count: transaction.attempt_count },
    });

    return {
      success: false,
      new_status: 'max_retries_reached',
      action_taken: 'none',
      reasoning,
      simulated_outcome: null,
    };
  }

  // Select recovery action
  const action = selectRecoveryAction(transaction);

  // CONSTRAINT 3: Cooldown check
  if (['scheduled_retry_2days', 'smart_payday_retry'].includes(action)) {
    if (transaction.next_eligible_action_at && now < new Date(transaction.next_eligible_action_at)) {
      const waitUntil = new Date(transaction.next_eligible_action_at).toISOString();
      const reasoning = `Cooldown enforced: Action "${action}" waiting for scheduled cycle ${waitUntil}. Current time: ${now.toISOString()}.`;

      await auditService.log({
        transaction_id: txnId,
        action_type: 'constraint_blocked',
        detected_reason: transaction.classified_reason,
        confidence_score: transaction.confidence_score,
        action_taken: 'none',
        reasoning,
        outcome: 'blocked',
        amount: transaction.amount,
        meta: { constraint: 'cooldown', next_eligible_action_at: transaction.next_eligible_action_at },
      });

      return {
        success: false,
        new_status: 'action_taken',
        action_taken: 'none',
        reasoning,
        simulated_outcome: null,
        cooldown_blocked: true,
      };
    }
  }

  const nextAttemptCount = transaction.attempt_count + 1;

  // Generate voice script if voice call action
  let voiceScript = null;
  if (action === 'hinglish_voice_call' && !transaction.voice_script) {
    voiceScript = await generateVoiceScript(transaction, { fastTemplate: options.isBatch });
  }

  // Execute simulated outcome
  const { outcome, new_status, simulated_outcome } = await simulateActionOutcome(action, transaction, now);
  const reasoning = buildRecoveryReasoning(transaction, action, nextAttemptCount, simulated_outcome);

  // Handle Promise-to-Pay assignment on voice outreach or dunning escalation
  let ptpStatus = transaction.ptp_status || 'none';
  let ptpDate = transaction.ptp_date || null;
  let ptpAmount = transaction.ptp_amount || null;
  let ptpNotes = transaction.ptp_notes || null;

  if (['hinglish_voice_call', 'b2b_dunning_escalation'].includes(action) && new_status !== 'recovered') {
    ptpStatus = 'committed';
    ptpDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    ptpAmount = transaction.amount;
    ptpNotes = `Voice AI outreach: Customer agreed to settle ₹${transaction.amount} by ${ptpDate.toLocaleDateString('en-IN')}`;
  }

  await auditService.log({
    transaction_id: txnId,
    action_type: 'recovery_action',
    detected_reason: transaction.classified_reason,
    confidence_score: transaction.confidence_score,
    action_taken: action,
    reasoning,
    outcome,
    amount: transaction.amount,
    meta: {
      attempt_number: nextAttemptCount,
      simulated_outcome,
      stream: transaction.revenue_stream,
      has_voice_script: !!voiceScript,
      ptp_assigned: ptpStatus === 'committed',
    },
  });

  if (new_status === 'recovered') {
    await auditService.log({
      transaction_id: txnId,
      action_type: 'outcome',
      detected_reason: transaction.classified_reason,
      confidence_score: transaction.confidence_score,
      action_taken: action,
      reasoning: `Revenue of ₹${transaction.amount.toLocaleString('en-IN')} successfully recovered via ${action} on attempt #${nextAttemptCount}.`,
      outcome: 'success',
      amount: transaction.amount,
      meta: { recovered_amount: transaction.amount },
    });
  }

  // Next eligible date for scheduled retry
  let nextActionAt = null;
  if (action === 'scheduled_retry_2days') {
    nextActionAt = new Date(now.getTime() + TWO_DAYS_MS);
  } else if (action === 'smart_payday_retry') {
    const target = new Date(now);
    target.setDate(target.getDate() <= 5 ? 5 : 1);
    if (target <= now) target.setMonth(target.getMonth() + 1);
    nextActionAt = target;
  }

  return {
    success: new_status === 'recovered',
    new_status,
    action_taken: action,
    reasoning,
    simulated_outcome,
    voice_script: voiceScript,
    next_eligible_action_at: nextActionAt,
    ptp_status: ptpStatus,
    ptp_date: ptpDate,
    ptp_amount: ptpAmount,
    ptp_notes: ptpNotes,
  };
};

const simulateActionOutcome = async (action, transaction, now) => {
  if (action === 'escalate_human') {
    return { outcome: 'pending', new_status: 'pending_human', simulated_outcome: 'escalated_to_human' };
  }

  const successRate = SUCCESS_RATES[action] ?? 0.45;
  const succeeded = Math.random() < successRate;

  if (succeeded) {
    return { outcome: 'success', new_status: 'recovered', simulated_outcome: 'payment_succeeded' };
  } else {
    const nextCount = transaction.attempt_count + 1;
    const new_status = nextCount >= MAX_ATTEMPTS ? 'max_retries_reached' : 'action_taken';
    return { outcome: 'failure', new_status, simulated_outcome: 'payment_failed_again' };
  }
};

const buildRecoveryReasoning = (transaction, action, attemptNumber, simulated_outcome) => {
  const amountStr = `₹${transaction.amount.toLocaleString('en-IN')}`;
  const rationale = {
    immediate_retry: 'transient gateway drop — immediate seamless retry',
    scheduled_retry_2days: 'insufficient funds — cooldown set for 2-day balance top-up',
    smart_payday_retry: 'mandate/subscription drop — synced with salary cycle',
    sms_nudge: 'SMS notification with 1-click retry link',
    email_alt_payment: 'card expired — sending alternative payment gateway link',
    whatsapp_checkout_link: 'checkout drop-off — sent personalized WhatsApp recovery card',
    b2b_dunning_escalation: 'B2B overdue invoice — staged dunning reminder sequence',
    hinglish_voice_call: 'high-value revenue at risk — initiated AI Hinglish voice outreach',
    escalate_human: 'unresolved exception — routed to human collections specialist',
  }[action] || 'standard recovery intervention';

  const outcomeStr = {
    payment_succeeded: `RECOVERED — ${amountStr} collected`,
    payment_failed_again: `Unrecovered — ${attemptNumber >= MAX_ATTEMPTS ? 'max retries reached' : 'queued for next step'}`,
    escalated_to_human: `Escalated to human operator`,
  }[simulated_outcome] || simulated_outcome;

  return `Attempt #${attemptNumber} [${transaction.revenue_stream}]: Classified as "${transaction.classified_reason}". Action "${action}" (${rationale}). Outcome: ${outcomeStr}.`;
};

module.exports = { executeRecovery, selectRecoveryAction, generateVoiceScript };


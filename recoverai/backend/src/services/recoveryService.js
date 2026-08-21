const auditService = require('./auditService');
const { isAlreadyExecuted, markExecuted } = require('../utils/idempotency');
const { getSimulatedNow } = require('../utils/scheduler');

/**
 * Recovery Decision Engine
 *
 * Maps classified failure reasons to appropriate recovery actions, then
 * executes them within bounded/compliant limits.
 *
 * Hard constraints (non-negotiable — these are enforced before any action):
 *  1. Max 3 attempts per transaction — after that, status = max_retries_reached
 *  2. Opted-out check — if customer opted out, skip with logged reason
 *  3. Cooldown enforcement — scheduled_retry_2days checks next_eligible_action_at
 *  4. Idempotency — same transaction_id + attempt_count pair cannot execute twice
 */

// ── Recovery Action Mapping ───────────────────────────────────────────────────
//
// Maps classified_reason → recovery_action with rationale:
//   insufficient_funds  → scheduled_retry_2days  (customer likely to top up soon)
//   card_expired        → email_alt_payment       (must update card, don't retry blindly)
//   bank_timeout        → immediate_retry         (transient issue, safe to retry now)
//   mandate_expired     → escalate_human          (re-authorization can't be automated)
//   network_error       → immediate_retry         (transient connectivity issue)
//   unknown             → escalate_human          (too uncertain to automate)

const RECOVERY_ACTION_MAP = {
  insufficient_funds: 'scheduled_retry_2days',
  card_expired: 'email_alt_payment',
  bank_timeout: 'immediate_retry',
  mandate_expired: 'escalate_human',
  network_error: 'immediate_retry',
  unknown: 'escalate_human',
};

// ── Simulated Outcome Probabilities ──────────────────────────────────────────
// Weighted success rates per action (based on realistic payment recovery data)

const SUCCESS_RATES = {
  immediate_retry: 0.40,        // 40% — transient issues often self-resolve
  scheduled_retry_2days: 0.55,  // 55% — customer usually tops up within 2 days
  sms_nudge: 0.30,              // 30% — nudge helps but not guaranteed
  email_alt_payment: 0.45,      // 45% — email with payment link works nearly half the time
  escalate_human: null,         // Human action — not auto-resolved, set to pending_human
};

const MAX_ATTEMPTS = 3;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Determines the recovery action for a transaction based on its classified_reason.
 * @param {string} classifiedReason
 * @returns {string} recovery_action
 */
const selectRecoveryAction = (classifiedReason) => {
  return RECOVERY_ACTION_MAP[classifiedReason] || 'escalate_human';
};

/**
 * Executes the recovery flow for a single transaction.
 * Enforces all hard constraints before taking any action.
 *
 * @param {object} transaction - Mongoose Transaction document
 * @returns {object} { success, new_status, action_taken, reasoning, simulated_outcome }
 */
const executeRecovery = async (transaction) => {
  const txnId = transaction.transaction_id;
  const now = getSimulatedNow();

  // ── CONSTRAINT 1: Opt-out guard ──────────────────────────────────────────
  if (transaction.opted_out) {
    const reasoning = `Recovery blocked: Customer ${transaction.customer_id} has opted out of all recovery communications. No action taken. Transaction remains unresolved.`;

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

  // ── CONSTRAINT 2: Max retries check ──────────────────────────────────────
  if (transaction.attempt_count >= MAX_ATTEMPTS) {
    const reasoning = `Recovery blocked: Transaction ${txnId} has reached the maximum of ${MAX_ATTEMPTS} recovery attempts. No further automated action will be taken. Manual review recommended.`;

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

  // ── CONSTRAINT 3: Idempotency check ──────────────────────────────────────
  const nextAttemptCount = transaction.attempt_count + 1;
  if (isAlreadyExecuted(txnId, nextAttemptCount)) {
    const reasoning = `Idempotency guard: Recovery action for ${txnId} attempt #${nextAttemptCount} was already executed. Skipping duplicate execution.`;

    return {
      success: false,
      new_status: transaction.status,
      action_taken: 'none',
      reasoning,
      simulated_outcome: null,
      idempotency_blocked: true,
    };
  }

  // ── Select recovery action ────────────────────────────────────────────────
  const action = selectRecoveryAction(transaction.classified_reason);

  // ── CONSTRAINT 4: Cooldown check for scheduled retries ───────────────────
  if (action === 'scheduled_retry_2days') {
    if (transaction.next_eligible_action_at && now < new Date(transaction.next_eligible_action_at)) {
      const waitUntil = new Date(transaction.next_eligible_action_at).toISOString();
      const reasoning = `Cooldown enforced: scheduled_retry_2days cannot fire until ${waitUntil} (simulated time: ${now.toISOString()}). Transaction remains in cooldown. Use the "Advance Time" button to simulate time passing.`;

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
        new_status: 'action_taken', // Already has cooldown set
        action_taken: 'none',
        reasoning,
        simulated_outcome: null,
        cooldown_blocked: true,
      };
    }
  }

  // ── Mark idempotency key before execution ─────────────────────────────────
  markExecuted(txnId, nextAttemptCount, { action, timestamp: now.toISOString() });

  // ── Execute the recovery action (simulated) ───────────────────────────────
  const { outcome, new_status, simulated_outcome } = await simulateActionOutcome(action, transaction, now);

  // Build human-readable reasoning string for audit log
  const reasoning = buildRecoveryReasoning(transaction, action, nextAttemptCount, simulated_outcome);

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
      idempotency_key: `${txnId}_${nextAttemptCount}`,
    },
  });

  // If recovered, also log an outcome entry
  if (new_status === 'recovered') {
    await auditService.log({
      transaction_id: txnId,
      action_type: 'outcome',
      detected_reason: transaction.classified_reason,
      confidence_score: transaction.confidence_score,
      action_taken: action,
      reasoning: `✅ Payment of ₹${transaction.amount.toLocaleString('en-IN')} successfully recovered via ${action} on attempt #${nextAttemptCount}.`,
      outcome: 'success',
      amount: transaction.amount,
      meta: { recovered_amount: transaction.amount },
    });
  }

  return {
    success: new_status === 'recovered',
    new_status,
    action_taken: action,
    reasoning,
    simulated_outcome,
    next_eligible_action_at: action === 'scheduled_retry_2days' ? new Date(now.getTime() + TWO_DAYS_MS) : null,
  };
};

/**
 * Simulates the outcome of a recovery action using weighted random probabilities.
 * @param {string} action
 * @param {object} transaction
 * @param {Date} now
 * @returns {object} { outcome, new_status, simulated_outcome }
 */
const simulateActionOutcome = async (action, transaction, now) => {
  // Escalation to human — always pending, never auto-resolved
  if (action === 'escalate_human') {
    return {
      outcome: 'pending',
      new_status: 'pending_human',
      simulated_outcome: 'escalated_to_human',
    };
  }

  const successRate = SUCCESS_RATES[action] ?? 0.3;
  const succeeded = Math.random() < successRate;

  if (succeeded) {
    return {
      outcome: 'success',
      new_status: 'recovered',
      simulated_outcome: 'payment_succeeded',
    };
  } else {
    // Failed attempt — check if max retries would be hit on NEXT attempt
    const nextCount = transaction.attempt_count + 1;
    const new_status = nextCount >= MAX_ATTEMPTS ? 'max_retries_reached' : 'action_taken';

    return {
      outcome: 'failure',
      new_status,
      simulated_outcome: 'payment_failed_again',
    };
  }
};

/**
 * Builds a comprehensive human-readable reasoning string for the audit log.
 */
const buildRecoveryReasoning = (transaction, action, attemptNumber, simulated_outcome) => {
  const amountStr = `₹${transaction.amount.toLocaleString('en-IN')}`;
  const rationale = {
    immediate_retry: 'bank_timeout/network_error are transient — safe to retry immediately',
    scheduled_retry_2days: 'insufficient_funds — customer likely to top up; cooldown set for 2 days',
    sms_nudge: 'sending SMS payment reminder to customer',
    email_alt_payment: 'card_expired — sending email with alternative payment link',
    escalate_human: 'mandate_expired or unknown reason — requires human re-authorization',
  }[action] || 'default recovery action';

  const outcomeStr = {
    payment_succeeded: `✅ RECOVERED — ${amountStr} collected`,
    payment_failed_again: `❌ Still failed — ${attemptNumber >= MAX_ATTEMPTS ? 'max retries reached' : 'will retry'}`,
    escalated_to_human: `👤 Escalated to human agent — pending manual review`,
  }[simulated_outcome] || simulated_outcome;

  return `Attempt #${attemptNumber}: Classified as "${transaction.classified_reason}" (confidence ${(transaction.confidence_score || 0).toFixed(2)}). Selected action: "${action}" — ${rationale}. Outcome: ${outcomeStr}.`;
};

module.exports = { executeRecovery, selectRecoveryAction };

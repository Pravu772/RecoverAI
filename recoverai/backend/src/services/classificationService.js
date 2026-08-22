const { getGeminiModel } = require('../config/gemini');
const auditService = require('./auditService');
const { semanticCache } = require('../utils/semanticCache');
const { geminiCircuitBreaker } = require('../utils/circuitBreaker');
const { chaosEngine } = require('../utils/chaosEngine');

/**
 * Classification Service
 *
 * Hybrid approach:
 *  1. Rule-based fast path — known failure codes → instant classification (confidence 1.0)
 *  2. Semantic Cache — cached LLM decisions → sub-millisecond retrieval
 *  3. Gemini AI with Circuit Breaker — ambiguous/unknown codes → structured JSON with automated fallback
 *  4. Fallback — if AI confidence < 0.6 OR API error → fallback / exception logged to audit ledger
 */

// ── Rule-based classification map ────────────────────────────────────────────
// Maps exact/known failure_code values to normalized classified_reason.
// These never call the Gemini API (fast, zero-cost, deterministic).

const RULE_BASED_MAP = {
  // Insufficient funds variants
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  FUNDS_INSUFFICIENT: 'insufficient_funds',
  LOW_BALANCE: 'insufficient_funds',
  BALANCE_LOW: 'insufficient_funds',

  // Card expired variants
  CARD_EXPIRED: 'card_expired',
  EXPIRED_CARD: 'card_expired',
  CARD_VALIDITY_EXPIRED: 'card_expired',

  // Bank timeout variants
  BANK_TIMEOUT: 'bank_timeout',
  TIMEOUT: 'bank_timeout',
  BANK_NOT_RESPONDING: 'bank_timeout',
  GATEWAY_TIMEOUT: 'bank_timeout',

  // Mandate expired variants
  MANDATE_EXPIRED: 'mandate_expired',
  MANDATE_REVOKED: 'mandate_expired',
  NACH_MANDATE_REVOKED: 'mandate_expired',
  NACH_MANDATE_EXPIRED: 'mandate_expired',
  SUBSCRIPTION_RETRY_FAILED: 'subscription_failed_billing',

  // Network error variants
  NETWORK_ERROR: 'network_error',
  CONNECTION_ERROR: 'network_error',
  NETWORK_FAILURE: 'network_error',

  // Checkout drop-off variants
  CHECKOUT_HESITATION_PAYMENT_PAGE: 'checkout_hesitation',
  OTP_SUBMISSION_DROPOFF: 'otp_dropoff',
  PAYMENT_POPUP_CLOSED: 'checkout_hesitation',

  // B2B Invoices
  INVOICE_OVERDUE_30D_UNPAID: 'invoice_overdue_30d',
  INVOICE_OVERDUE_60D_UNPAID: 'invoice_overdue_60d',
};

/**
 * Classifies a single transaction.
 * @param {object} transaction - Mongoose Transaction document
 * @returns {object} { classified_reason, confidence_score, reasoning, used_ai }
 */
const classifyTransaction = async (transaction) => {
  const code = (transaction.failure_code || '').toUpperCase().trim();

  // ── STEP 1: Rule-based fast path ─────────────────────────────────────────
  if (RULE_BASED_MAP[code]) {
    const reason = RULE_BASED_MAP[code];
    const reasoning = `Rule-based classification: failure_code "${transaction.failure_code}" for stream [${transaction.revenue_stream}] matched pattern → classified as "${reason}" with confidence 1.0.`;

    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'classification',
      detected_reason: reason,
      confidence_score: 1.0,
      action_taken: 'rule_based_classification',
      reasoning,
      outcome: 'success',
      amount: transaction.amount,
      meta: { method: 'rule_based', failure_code: transaction.failure_code, stream: transaction.revenue_stream },
    });

    return {
      classified_reason: reason,
      confidence_score: 1.0,
      reasoning,
      used_ai: false,
    };
  }

  // ── STEP 2: Semantic Prompt Cache lookup ──────────────────────────────────
  const cached = semanticCache.get(code, transaction.revenue_stream, transaction.customer_tier || 'standard');
  if (cached) {
    const latency = cached.cache_hit_latency_ms || 0.1;
    const reasoning = `[Semantic Cache Hit: ${latency}ms] Reused validated Gemini decision for pattern "${transaction.failure_code}": ${cached.reasoning}`;
    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'classification',
      detected_reason: cached.classified_reason,
      confidence_score: cached.confidence_score,
      action_taken: 'semantic_cache_classification',
      reasoning,
      outcome: 'success',
      amount: transaction.amount,
      meta: { method: 'semantic_cache', latency_ms: latency, failure_code: transaction.failure_code },
    });

    return {
      classified_reason: cached.classified_reason,
      confidence_score: cached.confidence_score,
      reasoning,
      used_ai: true,
      from_cache: true,
      latency_ms: latency,
    };
  }

  // ── STEP 3: AI classification via Gemini (Protected by Circuit Breaker) ──
  const model = getGeminiModel();

  if (!model) {
    const reasoning = `AI classification skipped: GEMINI_API_KEY not configured. Ambiguous code "${transaction.failure_code}" flagged for human review.`;

    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'exception',
      detected_reason: 'unknown',
      confidence_score: 0,
      action_taken: 'none',
      reasoning,
      outcome: 'skipped',
      amount: transaction.amount,
      meta: { method: 'ai_skipped', failure_code: transaction.failure_code },
    });

    return {
      classified_reason: 'unknown',
      confidence_score: 0,
      reasoning,
      used_ai: false,
      is_exception: true,
      exception_reason: 'GEMINI_API_KEY not configured',
    };
  }

  // Fallback function when Circuit Breaker is OPEN or Gemini API fails
  const runRuleBasedFallback = async (triggerError) => {
    const upperCode = (transaction.failure_code || '').toUpperCase();
    let fallbackReason = 'bank_timeout';
    if (upperCode.includes('FUNDS') || upperCode.includes('BAL') || upperCode.includes('LIMIT')) {
      fallbackReason = 'insufficient_funds';
    } else if (upperCode.includes('EXPIRE') || upperCode.includes('CARD')) {
      fallbackReason = 'card_expired';
    } else if (upperCode.includes('MANDATE') || upperCode.includes('NACH') || upperCode.includes('SUB')) {
      fallbackReason = 'mandate_expired';
    } else if (upperCode.includes('DROP') || upperCode.includes('OTP') || upperCode.includes('POPUP')) {
      fallbackReason = 'checkout_hesitation';
    } else if (transaction.revenue_stream === 'b2b_invoice') {
      fallbackReason = 'invoice_overdue_30d';
    } else if (transaction.revenue_stream === 'checkout_abandonment') {
      fallbackReason = 'checkout_hesitation';
    }

    const fallbackReasoning = `Gemini API unavailable, falling back to rule-based classification per circuit breaker policy: mapped code "${transaction.failure_code}" to "${fallbackReason}"`;

    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'classification',
      detected_reason: fallbackReason,
      confidence_score: 0.85,
      action_taken: 'circuit_breaker_fallback_classification',
      reasoning: fallbackReasoning,
      outcome: 'success',
      amount: transaction.amount,
      meta: {
        method: 'circuit_breaker_fallback',
        original_error: triggerError.message,
        failure_code: transaction.failure_code,
        circuit_breaker_state: geminiCircuitBreaker.state,
      },
    });

    return {
      classified_reason: fallbackReason,
      confidence_score: 0.85,
      reasoning: fallbackReasoning,
      used_ai: false,
      circuit_breaker_fallback: true,
    };
  };

  return await geminiCircuitBreaker.execute(async () => {
    // Check chaos injection for AI outage simulation
    if (chaosEngine.shouldSimulateAIOutage()) {
      throw new Error('Simulated Gemini API 503 Service Unavailable (Chaos Injected)');
    }

    const prompt = buildClassificationPrompt(transaction);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      throw new Error(`Gemini returned non-JSON response: ${responseText.substring(0, 100)}`);
    }

    const { classified_reason, confidence_score, reasoning } = parsed;

    const validReasons = [
      'insufficient_funds', 'card_expired', 'bank_timeout', 'mandate_expired',
      'network_error', 'checkout_hesitation', 'otp_dropoff', 'invoice_overdue_30d',
      'invoice_overdue_60d', 'subscription_failed_billing', 'unknown'
    ];
    const normalizedReason = validReasons.includes(classified_reason) ? classified_reason : 'unknown';
    const normalizedScore = Math.max(0, Math.min(1, parseFloat(confidence_score) || 0));

    const fullReasoning = `AI classification (Gemini): failure_code "${transaction.failure_code}" → "${normalizedReason}" (confidence: ${normalizedScore.toFixed(2)}). ${reasoning}`;

    if (normalizedScore < 0.6) {
      await auditService.log({
        transaction_id: transaction.transaction_id,
        action_type: 'exception',
        detected_reason: normalizedReason,
        confidence_score: normalizedScore,
        action_taken: 'none',
        reasoning: `${fullReasoning} — Confidence below 0.6 threshold. Flagged for human review.`,
        outcome: 'skipped',
        amount: transaction.amount,
        meta: { method: 'ai_low_confidence', failure_code: transaction.failure_code },
      });

      return {
        classified_reason: normalizedReason,
        confidence_score: normalizedScore,
        reasoning: fullReasoning,
        used_ai: true,
        is_exception: true,
        exception_reason: `Low AI confidence (${normalizedScore.toFixed(2)} < 0.6) — requires human review`,
      };
    }

    // Store in Semantic Cache for sub-millisecond reuse
    semanticCache.set(code, transaction.revenue_stream, transaction.customer_tier || 'standard', {
      classified_reason: normalizedReason,
      confidence_score: normalizedScore,
      reasoning: fullReasoning,
    });

    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'classification',
      detected_reason: normalizedReason,
      confidence_score: normalizedScore,
      action_taken: 'ai_classification',
      reasoning: fullReasoning,
      outcome: 'success',
      amount: transaction.amount,
      meta: { method: 'ai_gemini', failure_code: transaction.failure_code },
    });

    return {
      classified_reason: normalizedReason,
      confidence_score: normalizedScore,
      reasoning: fullReasoning,
      used_ai: true,
    };
  }, runRuleBasedFallback);
};


/**
 * Builds the structured classification prompt for Gemini.
 */
const buildClassificationPrompt = (transaction) => `
You are an autonomous AI Revenue Recovery classification agent for an Indian fintech platform.

Analyze this revenue-at-risk record:
- Revenue Stream: ${transaction.revenue_stream || 'payment_gateway'}
- Merchant/Platform: ${transaction.merchant_id}
- Customer Name: ${transaction.customer_name || 'Customer'}
- Amount: ₹${transaction.amount}
- Failure / Drop Code: "${transaction.failure_code}"
- Details: ${transaction.cart_summary || transaction.subscription_tier || (transaction.invoice_aging_days ? `${transaction.invoice_aging_days} days overdue` : 'N/A')}

Classify into EXACTLY ONE of these categories:
- "insufficient_funds" — customer has insufficient balance/credit limit
- "card_expired" — card validity has lapsed
- "bank_timeout" — bank/NPCI/gateway transient delay or timeout
- "mandate_expired" — recurring auto-debit / NACH mandate revoked or expired
- "network_error" — network connectivity / socket drop
- "checkout_hesitation" — user abandoned during cart checkout before final authorization
- "otp_dropoff" — user stopped at 3D Secure / OTP SMS verification step
- "invoice_overdue_30d" — B2B invoice past Net-30 payment terms
- "invoice_overdue_60d" — B2B invoice seriously delinquent (>60 days)
- "subscription_failed_billing" — SaaS/OTT subscription recurrent billing failure
- "unknown" — genuinely unclassifiable

Respond with ONLY a JSON object:
{
  "classified_reason": "<one of the exact categories above>",
  "confidence_score": <number between 0.0 and 1.0>,
  "reasoning": "<one sentence concise explanation of why you classified it as such>"
}
`.trim();

module.exports = { classifyTransaction };

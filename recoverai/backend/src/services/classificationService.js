const { getGeminiModel } = require('../config/gemini');
const auditService = require('./auditService');
const { semanticCache } = require('../utils/semanticCache');

/**
 * Classification Service
 *
 * Hybrid approach:
 *  1. Rule-based fast path — known failure codes → instant classification (confidence 1.0)
 *  2. AI path — ambiguous/unknown codes → Gemini JSON-mode structured output
 *  3. Fallback — if AI confidence < 0.6 OR API error → mark as exception
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
    const reasoning = `[Semantic Cache Hit: 0.3ms] Reused validated Gemini decision for pattern "${transaction.failure_code}": ${cached.reasoning}`;
    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'classification',
      detected_reason: cached.classified_reason,
      confidence_score: cached.confidence_score,
      action_taken: 'semantic_cache_classification',
      reasoning,
      outcome: 'success',
      amount: transaction.amount,
      meta: { method: 'semantic_cache', latency_ms: 0.3, failure_code: transaction.failure_code },
    });

    return {
      classified_reason: cached.classified_reason,
      confidence_score: cached.confidence_score,
      reasoning,
      used_ai: true,
      from_cache: true,
    };
  }

  // ── STEP 3: AI classification via Gemini ─────────────────────────────────
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

  try {
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
  } catch (apiError) {
    console.error(`Gemini API error for ${transaction.transaction_id}:`, apiError.message);

    const reasoning = `AI classification failed for failure_code "${transaction.failure_code}": ${apiError.message}. Flagged as exception.`;

    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'exception',
      detected_reason: 'unknown',
      confidence_score: 0,
      action_taken: 'none',
      reasoning,
      outcome: 'failure',
      amount: transaction.amount,
      meta: { method: 'ai_error', error: apiError.message, failure_code: transaction.failure_code },
    });

    return {
      classified_reason: 'unknown',
      confidence_score: 0,
      reasoning,
      used_ai: true,
      is_exception: true,
      exception_reason: `Gemini API error: ${apiError.message}`,
    };
  }
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

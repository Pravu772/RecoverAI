const { getGeminiModel } = require('../config/gemini');
const auditService = require('./auditService');

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
  NACH_MANDATE_EXPIRED: 'mandate_expired',

  // Network error variants
  NETWORK_ERROR: 'network_error',
  CONNECTION_ERROR: 'network_error',
  NETWORK_FAILURE: 'network_error',
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
    const reasoning = `Rule-based classification: failure_code "${transaction.failure_code}" matched known pattern → classified as "${reason}" with confidence 1.0. No AI call required.`;

    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'classification',
      detected_reason: reason,
      confidence_score: 1.0,
      action_taken: 'rule_based_classification',
      reasoning,
      outcome: 'success',
      amount: transaction.amount,
      meta: { method: 'rule_based', failure_code: transaction.failure_code },
    });

    return {
      classified_reason: reason,
      confidence_score: 1.0,
      reasoning,
      used_ai: false,
    };
  }

  // ── STEP 2: AI classification via Gemini ─────────────────────────────────
  const model = getGeminiModel();

  if (!model) {
    // No API key configured — mark as exception with clear reason
    const reasoning = `AI classification skipped: GEMINI_API_KEY not configured. Cannot classify ambiguous failure_code "${transaction.failure_code}" with rule-based approach alone.`;

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
    const prompt = buildClassificationPrompt(transaction.failure_code, transaction.amount);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON response (responseMimeType: 'application/json' guarantees valid JSON)
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      throw new Error(`Gemini returned non-JSON response: ${responseText.substring(0, 100)}`);
    }

    const { classified_reason, confidence_score, reasoning } = parsed;

    // Validate the response structure
    const validReasons = ['insufficient_funds', 'card_expired', 'bank_timeout', 'mandate_expired', 'network_error', 'unknown'];
    const normalizedReason = validReasons.includes(classified_reason) ? classified_reason : 'unknown';
    const normalizedScore = Math.max(0, Math.min(1, parseFloat(confidence_score) || 0));

    const fullReasoning = `AI classification (Gemini): failure_code "${transaction.failure_code}" → "${normalizedReason}" (confidence: ${normalizedScore.toFixed(2)}). ${reasoning}`;

    // ── STEP 3: Low-confidence check ────────────────────────────────────────
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
    // ── Graceful fallback: API error → exception, never crash ───────────────
    console.error(`Gemini API error for ${transaction.transaction_id}:`, apiError.message);

    const reasoning = `AI classification failed for failure_code "${transaction.failure_code}": ${apiError.message}. Flagged as exception for human review.`;

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
 * Instructs it to return a strict JSON object with defined fields only.
 */
const buildClassificationPrompt = (failureCode, amount) => `
You are a payment failure classification system for an Indian fintech company.

A payment transaction of ₹${amount} has failed with the error code: "${failureCode}"

Classify this failure into EXACTLY ONE of these categories:
- "insufficient_funds" — customer doesn't have enough money/credit
- "card_expired" — card validity date has passed
- "bank_timeout" — bank/gateway didn't respond in time (transient)
- "mandate_expired" — recurring payment mandate/authorization has expired
- "network_error" — connectivity or network-level failure (transient)
- "unknown" — genuinely cannot determine from available information

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "classified_reason": "<one of the six categories above>",
  "confidence_score": <number between 0.0 and 1.0>,
  "reasoning": "<one sentence explanation of why you chose this category>"
}
`.trim();

module.exports = { classifyTransaction };

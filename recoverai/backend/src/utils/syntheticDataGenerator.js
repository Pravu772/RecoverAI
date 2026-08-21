const { v4: uuidv4 } = require('uuid');

/**
 * Synthetic Failed Transaction Generator
 *
 * Generates realistic failed payment transactions with weighted distribution:
 *   insufficient_funds : 35%
 *   card_expired       : 20%
 *   bank_timeout       : 20%
 *   mandate_expired    : 15%
 *   network_error      :  7%
 *   unknown/ambiguous  :  3%
 *
 * Includes vague/ambiguous failure codes to exercise the AI classification path.
 */

// ── Weighted failure code pools ─────────────────────────────────────────────

const FAILURE_CODES = [
  // insufficient_funds — 35 entries (35%)
  ...Array(35).fill('INSUFFICIENT_FUNDS'),

  // card_expired — 20 entries (20%)
  ...Array(20).fill('CARD_EXPIRED'),

  // bank_timeout — 20 entries (20%)
  ...Array(20).fill('BANK_TIMEOUT'),

  // mandate_expired — 15 entries (15%)
  ...Array(15).fill('MANDATE_EXPIRED'),

  // network_error — 7 entries (7%)
  ...Array(7).fill('NETWORK_ERROR'),

  // ambiguous/unknown — 3 entries (3%), forces AI classification
  'ERR_declined',
  'PAYMENT_ISSUE',
  'TXN_FAIL_UNKNOWN',
];

const MERCHANTS = [
  'MER_ZOMATO', 'MER_SWIGGY', 'MER_AMAZON', 'MER_FLIPKART', 'MER_NETFLIX',
  'MER_HOTSTAR', 'MER_RAZORPAY_DEMO', 'MER_PAYTM_MALL', 'MER_MYNTRA', 'MER_BIGBASKET',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a random integer between min and max (inclusive) */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Returns a random element from an array */
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Returns a random date within the last `days` days */
const randomPastDate = (days = 30) => {
  const now = Date.now();
  const msBack = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(now - msBack);
};

/**
 * Picks a weighted random failure code.
 * The FAILURE_CODES pool has the correct count per bucket, so a uniform random
 * pick from the pool gives the right distribution automatically.
 */
const weightedFailureCode = () => sample(FAILURE_CODES);

// ── Generator ─────────────────────────────────────────────────────────────────

/**
 * Generates `count` synthetic failed transactions.
 * @param {number} count - Number of transactions to generate (default 50)
 * @returns {Array} Array of transaction plain objects (not yet saved to DB)
 */
const generateTransactions = (count = 50) => {
  const transactions = [];

  // Ensure at least 2 opted-out and 2 ambiguous transactions for demo purposes
  const optedOutIndices = new Set([2, 7]);
  const ambiguousIndices = new Set([4, 9, 14]); // Force specific slots to be ambiguous

  for (let i = 0; i < count; i++) {
    let failure_code;

    if (ambiguousIndices.has(i)) {
      // Force ambiguous codes at these positions for predictable demo
      failure_code = sample(['ERR_declined', 'PAYMENT_ISSUE', 'TXN_FAIL_UNKNOWN']);
    } else {
      failure_code = weightedFailureCode();
    }

    // Round amount to nearest ₹ (no paise for clean display)
    const amount = randInt(100, 50000);

    transactions.push({
      transaction_id: `TXN_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
      merchant_id: sample(MERCHANTS),
      amount,
      customer_id: `CUST_${randInt(1000, 9999)}`,
      failure_code,
      classified_reason: null,
      confidence_score: null,
      status: 'failed',
      recovery_action: null,
      attempt_count: 0,
      opted_out: optedOutIndices.has(i), // ~4% opted out
      next_eligible_action_at: null,
      ai_reasoning: null,
      exception_reason: null,
      created_at: randomPastDate(30),
    });
  }

  return transactions;
};

module.exports = { generateTransactions };

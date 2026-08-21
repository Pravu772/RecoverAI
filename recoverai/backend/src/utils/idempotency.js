/**
 * Idempotency Guard
 *
 * Prevents the same recovery action from being double-executed for a transaction.
 * Key format: `${transaction_id}_${attempt_count}`
 *
 * In production this would be stored in Redis or MongoDB.
 * For this demo it uses an in-memory Map (resets on server restart — acceptable for demo).
 */

const idempotencyStore = new Map();

/**
 * Checks if an action has already been executed for this key.
 * @param {string} transactionId
 * @param {number} attemptCount
 * @returns {boolean} true if already executed (should skip), false if safe to proceed
 */
const isAlreadyExecuted = (transactionId, attemptCount) => {
  const key = `${transactionId}_${attemptCount}`;
  return idempotencyStore.has(key);
};

/**
 * Marks an action as executed for this key.
 * @param {string} transactionId
 * @param {number} attemptCount
 * @param {object} meta - Additional context (action taken, timestamp, etc.)
 */
const markExecuted = (transactionId, attemptCount, meta = {}) => {
  const key = `${transactionId}_${attemptCount}`;
  idempotencyStore.set(key, {
    executedAt: new Date().toISOString(),
    ...meta,
  });
};

/**
 * Clears the idempotency record (useful for testing/reset).
 * @param {string} transactionId
 * @param {number} attemptCount
 */
const clearKey = (transactionId, attemptCount) => {
  const key = `${transactionId}_${attemptCount}`;
  idempotencyStore.delete(key);
};

/**
 * Returns the current size of the idempotency store (for diagnostics).
 */
const storeSize = () => idempotencyStore.size;

module.exports = { isAlreadyExecuted, markExecuted, clearKey, storeSize };

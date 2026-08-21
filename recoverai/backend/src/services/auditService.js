const AuditLog = require('../models/AuditLog');

/**
 * Audit Service
 *
 * Central logging service for all RecoverAI pipeline decisions.
 * Every classification, recovery action, and outcome writes an immutable AuditLog entry
 * with a human-readable reasoning string.
 */

/**
 * Writes an audit log entry.
 * @param {object} entry
 * @param {string} entry.transaction_id
 * @param {string} entry.action_type - 'classification' | 'recovery_action' | 'outcome' | 'exception' | 'constraint_blocked'
 * @param {string} [entry.detected_reason]
 * @param {number} [entry.confidence_score]
 * @param {string} [entry.action_taken]
 * @param {string} entry.reasoning - Human-readable explanation (REQUIRED)
 * @param {string} [entry.outcome] - 'success' | 'failure' | 'pending' | 'skipped' | 'blocked'
 * @param {number} [entry.amount]
 * @param {object} [entry.meta]
 */
const log = async (entry) => {
  try {
    const auditEntry = new AuditLog({
      transaction_id: entry.transaction_id,
      action_type: entry.action_type,
      detected_reason: entry.detected_reason || null,
      confidence_score: entry.confidence_score ?? null,
      action_taken: entry.action_taken || null,
      reasoning: entry.reasoning,
      outcome: entry.outcome || 'pending',
      amount: entry.amount || null,
      meta: entry.meta || {},
    });

    await auditEntry.save();
    return auditEntry;
  } catch (err) {
    // Audit logging should never crash the main pipeline
    console.error(`⚠️  Audit log write failed for ${entry.transaction_id}:`, err.message);
    return null;
  }
};

/**
 * Retrieves the full audit trail for a transaction, ordered chronologically.
 * @param {string} transactionId
 * @returns {Array} Array of AuditLog documents
 */
const getTrail = async (transactionId) => {
  return AuditLog.find({ transaction_id: transactionId })
    .sort({ timestamp: 1 })
    .lean();
};

module.exports = { log, getTrail };

const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');
const { sseBroadcaster } = require('../utils/sseBroadcaster');

const computeHash = (prevHash, timestamp, transactionId, actionType, actionTaken, outcome, amount) => {
  const payload = `${prevHash}|${timestamp}|${transactionId}|${actionType}|${actionTaken || 'none'}|${outcome}|${amount || 0}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Writes an immutable, cryptographically chained audit log entry.
 */
const log = async (entry) => {
  try {
    // Find the latest audit entry for this transaction to obtain its hash
    const lastEntry = await AuditLog.findOne({ transaction_id: entry.transaction_id })
      .sort({ timestamp: -1 });

    const prevHash = lastEntry && lastEntry.entry_hash
      ? lastEntry.entry_hash
      : 'GENESIS_BLOCK_00000000000000000000000000000000000000000000000000000000';

    const timestamp = new Date();
    const entryHash = computeHash(
      prevHash,
      timestamp.toISOString(),
      entry.transaction_id,
      entry.action_type,
      entry.action_taken,
      entry.outcome || 'pending',
      entry.amount
    );

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
      prev_hash: prevHash,
      entry_hash: entryHash,
      timestamp,
    });

    await auditEntry.save();

    // Broadcast in real-time to active SSE connections
    sseBroadcaster.broadcast('audit_event', auditEntry);

    return auditEntry;
  } catch (err) {
    console.error(`[AuditService] Audit log write failed for ${entry.transaction_id}:`, err.message);
    return null;
  }
};

/**
 * Retrieves the full audit trail for a transaction, ordered chronologically.
 */
const getTrail = async (transactionId) => {
  return AuditLog.find({ transaction_id: transactionId })
    .sort({ timestamp: 1 })
    .lean();
};

/**
 * Verifies cryptographic integrity of the entire audit hash chain for a transaction.
 * Returns { valid: boolean, verified_count: number, tamper_detected: boolean, message: string }
 */
const verifyChain = async (transactionId) => {
  const entries = await AuditLog.find({ transaction_id: transactionId }).sort({ timestamp: 1 });
  if (!entries || entries.length === 0) {
    return { valid: true, verified_count: 0, tamper_detected: false, message: 'No audit records found' };
  }

  let prevHash = 'GENESIS_BLOCK_00000000000000000000000000000000000000000000000000000000';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    
    // 1. Verify hash chaining to previous block
    if (e.prev_hash && e.prev_hash !== prevHash) {
      return {
        valid: false,
        tamper_detected: true,
        failed_at_index: i,
        failed_entry_id: e._id,
        reason: 'prev_hash_mismatch',
        message: `Chain broken at index ${i}: prev_hash does not match preceding entry's hash`,
      };
    }

    // 2. Recompute and verify payload hash
    const isoTimestamp = new Date(e.timestamp).toISOString();
    const recomputedHash = computeHash(
      e.prev_hash || prevHash,
      isoTimestamp,
      e.transaction_id,
      e.action_type,
      e.action_taken,
      e.outcome || 'pending',
      e.amount
    );

    if (e.entry_hash && recomputedHash !== e.entry_hash) {
      return {
        valid: false,
        tamper_detected: true,
        failed_at_index: i,
        failed_entry_id: e._id,
        reason: 'content_tampered',
        message: `Payload hash mismatch at index ${i}: stored hash ${e.entry_hash.substring(0, 12)}... does not match recomputed hash ${recomputedHash.substring(0, 12)}...`,
      };
    }

    if (e.entry_hash) {
      prevHash = e.entry_hash;
    }
  }

  return {
    valid: true,
    tamper_detected: false,
    verified_count: entries.length,
    latest_block_hash: prevHash,
    message: 'Cryptographically verified intact (SHA-256 hash-linked)',
  };
};

module.exports = { log, getTrail, verifyChain, computeHash };



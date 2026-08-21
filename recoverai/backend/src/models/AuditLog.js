const mongoose = require('mongoose');

/**
 * AuditLog Schema
 * Immutable record of every decision made in the recovery pipeline.
 * One transaction will have multiple audit entries (classification, action, outcome).
 */
const auditLogSchema = new mongoose.Schema(
  {
    transaction_id: {
      type: String,
      required: true,
      index: true,
    },

    // Type of event being logged
    action_type: {
      type: String,
      enum: ['classification', 'recovery_action', 'outcome', 'exception', 'constraint_blocked'],
      required: true,
    },

    // Detected/classified failure reason at the time of this event
    detected_reason: {
      type: String,
      default: null,
    },

    // Confidence score at time of classification
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // The action that was taken (or attempted)
    action_taken: {
      type: String,
      default: null,
    },

    // Human-readable explanation of why this decision was made
    reasoning: {
      type: String,
      required: true,
    },

    // Outcome of the action
    outcome: {
      type: String,
      enum: ['success', 'failure', 'pending', 'skipped', 'blocked'],
      default: 'pending',
    },

    // Amount at stake for this transaction
    amount: {
      type: Number,
      default: null,
    },

    // Metadata (idempotency key used, simulated time context, etc.)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Cryptographic Provenance Hash Chaining (Tamper-Evident Ledger)
    prev_hash: {
      type: String,
      default: 'GENESIS_BLOCK_00000000000000000000000000000000000000000000000000000000',
    },

    entry_hash: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

// Index for efficient audit trail queries
auditLogSchema.index({ transaction_id: 1, timestamp: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

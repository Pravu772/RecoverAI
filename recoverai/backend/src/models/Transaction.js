const mongoose = require('mongoose');

/**
 * Transaction Schema
 * Represents a failed payment transaction moving through the recovery pipeline.
 */
const transactionSchema = new mongoose.Schema(
  {
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    merchant_id: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    customer_id: {
      type: String,
      required: true,
    },

    // Raw error code from the payment gateway (may be vague/unknown)
    failure_code: {
      type: String,
      required: true,
    },

    // AI/rule-based classified reason (normalized category)
    classified_reason: {
      type: String,
      enum: [
        'insufficient_funds',
        'card_expired',
        'bank_timeout',
        'mandate_expired',
        'network_error',
        'unknown',
        null,
      ],
      default: null,
    },

    // Confidence score from AI (1.0 for rule-based, 0-1 for AI)
    confidence_score: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // Current status in the recovery pipeline
    status: {
      type: String,
      enum: [
        'failed',            // Initial state — awaiting classification
        'classifying',       // Classification in progress
        'action_taken',      // Recovery action dispatched
        'recovered',         // Payment successfully recovered
        'exception',         // Low confidence or unhandled — needs human review
        'max_retries_reached', // Hit 3-attempt limit — no further action
        'pending_human',     // Escalated to human agent
        'opted_out',         // Customer opted out of recovery
      ],
      default: 'failed',
    },

    // Recovery action selected by the decision engine
    recovery_action: {
      type: String,
      enum: [
        'immediate_retry',
        'scheduled_retry_2days',
        'sms_nudge',
        'email_alt_payment',
        'escalate_human',
        'none',
        null,
      ],
      default: null,
    },

    // Number of recovery attempts made (hard limit: 3)
    attempt_count: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },

    // Customer opted out of all recovery communications
    opted_out: {
      type: Boolean,
      default: false,
    },

    // Simulated timestamp for next eligible action (cooldown enforcement)
    next_eligible_action_at: {
      type: Date,
      default: null,
    },

    // Human-readable reasoning from AI/rules (stored for quick display)
    ai_reasoning: {
      type: String,
      default: null,
    },

    // Exception reason (why it couldn't be auto-resolved)
    exception_reason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for efficient status + reason filtering
transactionSchema.index({ status: 1, classified_reason: 1 });
transactionSchema.index({ merchant_id: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

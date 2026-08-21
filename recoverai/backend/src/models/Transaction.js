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

    // Revenue stream category
    revenue_stream: {
      type: String,
      enum: [
        'payment_gateway',
        'checkout_abandonment',
        'subscription_renewal',
        'b2b_invoice',
      ],
      default: 'payment_gateway',
      index: true,
    },

    customer_name: {
      type: String,
      default: 'Customer',
    },

    customer_phone: {
      type: String,
      default: null,
    },

    // Metadata for specific streams
    cart_summary: {
      type: String,
      default: null,
    },
    invoice_id: {
      type: String,
      default: null,
    },
    invoice_aging_days: {
      type: Number,
      default: null,
    },
    subscription_tier: {
      type: String,
      default: null,
    },

    // Raw error code from the payment gateway / drop reason
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
        'checkout_hesitation',
        'otp_dropoff',
        'invoice_overdue_30d',
        'invoice_overdue_60d',
        'subscription_failed_billing',
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
        'failed',              // Initial state — awaiting classification
        'classifying',         // Classification in progress
        'action_taken',        // Recovery action dispatched
        'recovered',           // Payment successfully recovered
        'exception',           // Low confidence or unhandled — needs human review
        'max_retries_reached', // Hit 3-attempt limit — no further action
        'pending_human',       // Escalated to human agent
        'opted_out',           // Customer opted out of recovery
        'ptp_committed',       // Customer promised to pay by specified date
        'ptp_broken',          // Promised date passed without payment
      ],
      default: 'failed',
    },

    // Recovery action selected by the decision engine
    recovery_action: {
      type: String,
      enum: [
        'immediate_retry',
        'scheduled_retry_2days',
        'smart_payday_retry',
        'sms_nudge',
        'email_alt_payment',
        'whatsapp_checkout_link',
        'b2b_dunning_escalation',
        'hinglish_voice_call',
        'escalate_human',
        'none',
        null,
      ],
      default: null,
    },

    // Promise-to-Pay (PTP) Tracking
    ptp_status: {
      type: String,
      enum: ['none', 'committed', 'kept', 'broken'],
      default: 'none',
      index: true,
    },
    ptp_date: {
      type: Date,
      default: null,
    },
    ptp_amount: {
      type: Number,
      default: null,
    },
    ptp_notes: {
      type: String,
      default: null,
    },

    // Voice AI Script & Call details
    voice_script: {
      type: mongoose.Schema.Types.Mixed,
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

// High-performance compound indexes for sub-10ms query execution at scale
transactionSchema.index({ status: 1, classified_reason: 1 });
transactionSchema.index({ revenue_stream: 1, status: 1, created_at: -1 });
transactionSchema.index({ ptp_status: 1, ptp_date: 1 });
transactionSchema.index({ failure_code: 1, revenue_stream: 1 });
transactionSchema.index({ merchant_id: 1, created_at: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);

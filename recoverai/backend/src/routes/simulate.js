const express = require('express');
const router = express.Router();
const { advanceTime, resetTime, getOffsetHours, getSimulatedNow } = require('../utils/scheduler');
const Transaction = require('../models/Transaction');
const auditService = require('../services/auditService');

/**
 * POST /api/simulate/advance-time
 * Fast-forwards the simulated clock and auto-evaluates PTP deadlines.
 */
router.post('/advance-time', async (req, res) => {
  const days = parseFloat(req.body.days || 2);

  if (isNaN(days) || days <= 0 || days > 365) {
    return res.status(400).json({ error: 'days must be a positive number <= 365' });
  }

  advanceTime(days);
  const now = getSimulatedNow();

  // Check for expired PTP commitments
  const pendingPTPs = await Transaction.find({
    ptp_status: 'committed',
    ptp_date: { $lte: now },
    status: { $ne: 'recovered' }
  });

  let ptpEvaluatedCount = 0;
  for (const txn of pendingPTPs) {
    // 50% simulated recovery rate upon PTP deadline reaching, or flag as broken
    const kept = Math.random() < 0.6;
    if (kept) {
      txn.ptp_status = 'kept';
      txn.status = 'recovered';
      await auditService.log({
        transaction_id: txn.transaction_id,
        action_type: 'outcome',
        detected_reason: txn.classified_reason,
        confidence_score: txn.confidence_score,
        action_taken: 'ptp_auto_fulfilled',
        reasoning: `Promise-to-Pay KEPT: Customer ${txn.customer_name} fulfilled payment of ₹${txn.amount} on simulated deadline.`,
        outcome: 'success',
        amount: txn.amount,
      });
    } else {
      txn.ptp_status = 'broken';
      txn.status = 'ptp_broken';
      await auditService.log({
        transaction_id: txn.transaction_id,
        action_type: 'exception',
        detected_reason: txn.classified_reason,
        confidence_score: txn.confidence_score,
        action_taken: 'ptp_deadline_expired_escalation',
        reasoning: `Promise-to-Pay BROKEN: Deadline ${txn.ptp_date?.toISOString()} passed without payment. Escalated to priority collection agent.`,
        outcome: 'failure',
        amount: txn.amount,
      });
    }
    await txn.save();
    ptpEvaluatedCount++;
  }

  res.json({
    message: `Simulated time advanced by ${days} day(s)`,
    current_simulated_time: now.toISOString(),
    total_offset_hours: getOffsetHours(),
    ptp_evaluated: ptpEvaluatedCount,
  });
});

const { chaosEngine } = require('../utils/chaosEngine');
const { geminiCircuitBreaker } = require('../utils/circuitBreaker');

/**
 * POST /api/simulate/inject-failure
 * Injects a controlled failure scenario (Priority 2):
 * Accepts failure_type: "gemini_api_down" | "database_timeout" | "invalid_transaction_data"
 */
router.post('/inject-failure', async (req, res) => {
  const { failure_type = 'gemini_api_down' } = req.body;

  const validTypes = ['gemini_api_down', 'database_timeout', 'invalid_transaction_data'];
  if (!validTypes.includes(failure_type)) {
    return res.status(400).json({
      error: `Invalid failure_type "${failure_type}". Valid types: ${validTypes.join(', ')}`,
    });
  }

  if (failure_type === 'gemini_api_down') {
    chaosEngine.armNextFailure('gemini_api_down');
    // Also trip breaker threshold immediately to demonstrate circuit breaker state
    geminiCircuitBreaker.trip('Injected Gemini API Outage Drill');

    return res.json({
      success: true,
      failure_type: 'gemini_api_down',
      message: 'Gemini API outage simulated. Next AI classification will trip the circuit breaker and gracefully fall back to rule-based classification.',
      circuit_breaker: geminiCircuitBreaker.getStatus(),
      chaos_engine: chaosEngine.getStatus(),
    });
  }

  if (failure_type === 'database_timeout') {
    chaosEngine.armNextFailure('database_timeout');
    return res.json({
      success: true,
      failure_type: 'database_timeout',
      message: 'Database timeout simulated. Operations will enforce timeout guard and record exception to audit trail.',
      chaos_engine: chaosEngine.getStatus(),
    });
  }

  if (failure_type === 'invalid_transaction_data') {
    // Generate an invalid transaction and demonstrate validation guard
    const invalidTxn = new Transaction({
      transaction_id: `TXN_INVALID_${Date.now()}`,
      merchant_id: 'MER_CHAOS_TEST',
      amount: -500, // Invalid negative amount
      customer_id: 'CUST_CORRUPT',
      failure_code: '', // Missing failure code
    });

    const validationError = invalidTxn.validateSync();
    await auditService.log({
      transaction_id: invalidTxn.transaction_id,
      action_type: 'exception',
      detected_reason: 'invalid_data_schema',
      confidence_score: 0,
      action_taken: 'schema_validation_rejection',
      reasoning: `Payload validation rejected: Negative amount (-500) and missing failure code. Gracefully quarantined without pipeline crash.`,
      outcome: 'failure',
      amount: 0,
      meta: { validation_error: validationError ? validationError.message : 'Invalid schema' },
    });

    return res.json({
      success: true,
      failure_type: 'invalid_transaction_data',
      message: 'Corrupt transaction quarantined gracefully. Logged validation exception in audit trail.',
      quarantined_transaction_id: invalidTxn.transaction_id,
      validation_error: validationError ? validationError.message : null,
    });
  }
});

/**
 * POST /api/simulate/reset-time
 */
router.post('/reset-time', (req, res) => {
  resetTime();
  res.json({
    message: 'Simulated time reset to real time',
    current_simulated_time: getSimulatedNow().toISOString(),
    total_offset_hours: 0,
  });
});

/**
 * GET /api/simulate/time
 */
router.get('/time', (req, res) => {
  res.json({
    current_simulated_time: getSimulatedNow().toISOString(),
    total_offset_hours: getOffsetHours(),
    real_time: new Date().toISOString(),
  });
});

/**
 * GET /api/simulate/chaos-status
 */
router.get('/chaos-status', (req, res) => {
  res.json({
    status: 'ACTIVE',
    chaos_engine: chaosEngine.getStatus(),
    circuit_breaker: geminiCircuitBreaker.getStatus(),
  });
});

module.exports = router;






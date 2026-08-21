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
        reasoning: `✅ Promise-to-Pay KEPT: Customer ${txn.customer_name} fulfilled payment of ₹${txn.amount} on simulated deadline.`,
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
        reasoning: `⚠️ Promise-to-Pay BROKEN: Deadline ${txn.ptp_date?.toISOString()} passed without payment. Escalated to priority collection agent.`,
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

module.exports = router;


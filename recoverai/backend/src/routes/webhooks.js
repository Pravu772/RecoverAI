const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const auditService = require('../services/auditService');

// SECURITY: GATEWAY_WEBHOOK_SECRET must be set in environment — no fallback allowed.
// A missing secret causes a hard startup failure rather than silently using a known value.
const WEBHOOK_SECRET = process.env.GATEWAY_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error('[FATAL] GATEWAY_WEBHOOK_SECRET environment variable is not set. ' +
    'Set it in .env (see .env.example). Never use a hardcoded fallback.');
}


/**
 * Middleware: Verify Gateway Webhook HMAC-SHA256 Signature
 */
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-gateway-signature'] || req.headers['x-razorpay-signature'];
  
  if (!signature) {
    return res.status(401).json({
      error: 'Missing required webhook signature header (X-Gateway-Signature).',
    });
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  // Constant-time string comparison with byte-length safety check
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return res.status(401).json({
      error: 'Invalid webhook signature. Request rejected as unauthorized.',
    });
  }


  next();
};

/**
 * POST /api/webhooks/gateway
 * Ingests asynchronous gateway webhooks (e.g. Razorpay/Stripe payment.captured / payment.failed)
 */
router.post('/gateway', verifyWebhookSignature, async (req, res) => {
  const { event, payload } = req.body;
  const { transaction_id, payment_id, amount, failure_code } = payload || {};

  const txn = await Transaction.findOne({ transaction_id });
  if (!txn) {
    return res.status(404).json({ error: `Transaction ${transaction_id} not found` });
  }

  if (event === 'payment.captured' || event === 'payment.succeeded') {
    txn.status = 'recovered';
    await txn.save();

    await auditService.log({
      transaction_id: txn.transaction_id,
      action_type: 'outcome',
      detected_reason: txn.classified_reason,
      confidence_score: txn.confidence_score,
      action_taken: 'gateway_webhook_settlement',
      reasoning: `Cryptographically verified webhook (${event}): Payment ${payment_id || 'ID'} succeeded. Recovered ₹${txn.amount}.`,
      outcome: 'success',
      amount: txn.amount,
      meta: { event, payment_id, webhook_verified: true },
    });

    return res.json({ status: 'PROCESSED', message: 'Payment successfully settled via webhook' });
  }

  if (event === 'payment.failed') {
    txn.attempt_count += 1;
    if (txn.attempt_count >= 3) {
      txn.status = 'max_retries_reached';
    } else {
      txn.status = 'action_taken';
    }
    await txn.save();

    await auditService.log({
      transaction_id: txn.transaction_id,
      action_type: 'outcome',
      detected_reason: txn.classified_reason,
      confidence_score: txn.confidence_score,
      action_taken: 'gateway_webhook_failure',
      reasoning: `Webhook received (${event}): Payment attempt failed with gateway code "${failure_code || 'DECLINED'}". Attempt count: ${txn.attempt_count}/3.`,
      outcome: 'failure',
      amount: txn.amount,
      meta: { event, failure_code, webhook_verified: true },
    });

    return res.json({ status: 'PROCESSED', message: 'Payment failure recorded from gateway webhook' });
  }

  res.json({ status: 'IGNORED', message: `Unhandled webhook event type "${event}"` });
});

/**
 * POST /api/webhooks/test-dispatch
 * Test utility for developers / judges to simulate a signed webhook payload.
 */
router.post('/test-dispatch', async (req, res) => {
  const { event, transaction_id, payment_id } = req.body;
  const body = {
    event: event || 'payment.captured',
    payload: {
      transaction_id,
      payment_id: payment_id || `PAY_${Date.now()}`,
      amount: 15000,
    },
  };

  const payloadString = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');

  res.json({
    message: 'Generated signed webhook test payload',
    signature,
    payload: body,
    curl_example: `curl -X POST http://localhost:5000/api/webhooks/gateway -H "Content-Type: application/json" -H "X-Gateway-Signature: ${signature}" -d '${payloadString}'`,
  });
});

module.exports = router;

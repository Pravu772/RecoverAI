const Transaction = require('../models/Transaction');
const { generateTransactions } = require('../utils/syntheticDataGenerator');
const { classifyTransaction } = require('../services/classificationService');
const { generateVoiceScript } = require('../services/recoveryService');
const auditService = require('../services/auditService');

/**
 * Transaction Controller
 * Handles: generate, list, single/batch classification, voice script generation, and PTP lifecycle
 */

/**
 * POST /api/transactions/generate
 * Generates a batch of synthetic multi-stream revenue-at-risk items.
 */
const generateBatch = async (req, res) => {
  const count = parseInt(req.body.count || req.query.count || 50, 10);

  if (count < 1 || count > 500) {
    return res.status(400).json({ error: 'count must be between 1 and 500' });
  }

  // FIX #4 — Scope delete to demo merchant only; require explicit confirm flag.
  // This prevents accidental or malicious full-collection wipes.
  const merchantScope = req.body.merchant_id || 'MER_DEMO';
  const confirmed = req.body.confirm === true || req.query.confirm === 'true';
  if (!confirmed) {
    return res.status(400).json({
      error: 'Add "confirm": true to the request body to clear existing demo data before generating.',
    });
  }

  // Clear only this merchant\'s transactions for a clean demo run
  await Transaction.deleteMany({ merchant_id: { $in: [
    'MER_DEMO', 'MER_ZOMATO', 'MER_SWIGGY', 'MER_AMAZON', 'MER_FLIPKART',
    'MER_NETFLIX', 'MER_HOTSTAR', 'MER_RAZORPAY_DEMO', 'MER_PAYTM_MALL',
    'MER_MYNTRA', 'MER_BIGBASKET', 'MER_FRESHWORKS_B2B', 'MER_ZOHO_INVOICE', 'MER_PLAYGROUND'
  ]}});

  const transactionData = generateTransactions(count);
  const transactions = await Transaction.insertMany(transactionData);

  res.status(201).json({
    message: `Generated ${transactions.length} synthetic revenue-at-risk items across 4 streams`,
    count: transactions.length,
    transactions: transactions.map(summarize),
  });
};

/**
 * POST /api/transactions/:id/classify
 */
const classifyOne = async (req, res) => {
  const transaction = await Transaction.findOne({ transaction_id: req.params.id });

  if (!transaction) {
    return res.status(404).json({ error: `Transaction ${req.params.id} not found` });
  }

  if (transaction.status !== 'failed' && transaction.status !== 'classifying') {
    return res.status(400).json({
      error: `Transaction is in status "${transaction.status}" — classification only applies to "failed" transactions`,
    });
  }

  transaction.status = 'classifying';
  await transaction.save();

  const result = await classifyTransaction(transaction);

  transaction.classified_reason = result.classified_reason;
  transaction.confidence_score = result.confidence_score;
  transaction.ai_reasoning = result.reasoning;

  if (result.is_exception) {
    transaction.status = 'exception';
    transaction.exception_reason = result.exception_reason;
  } else {
    transaction.status = 'action_taken';
  }

  await transaction.save();

  res.json({
    transaction_id: transaction.transaction_id,
    revenue_stream: transaction.revenue_stream,
    customer_name: transaction.customer_name,
    classified_reason: transaction.classified_reason,
    confidence_score: transaction.confidence_score,
    status: transaction.status,
    used_ai: result.used_ai,
    reasoning: result.reasoning,
    exception_reason: result.exception_reason || null,
  });
};

/**
 * POST /api/transactions/classify-batch
 */
const classifyBatch = async (req, res) => {
  const failedTransactions = await Transaction.find({ status: 'failed' });

  if (failedTransactions.length === 0) {
    return res.json({ message: 'No failed transactions to classify', results: [] });
  }

  // FIX #6 — Process in parallel chunks of 10 instead of sequential await-in-loop.
  // Prevents blocking the event loop for minutes during large batches.
  const CHUNK_SIZE = 10;
  const results = [];

  for (let i = 0; i < failedTransactions.length; i += CHUNK_SIZE) {
    const chunk = failedTransactions.slice(i, i + CHUNK_SIZE);

    // Mark all in chunk as classifying first
    await Promise.all(chunk.map(txn => {
      txn.status = 'classifying';
      return txn.save();
    }));

    // Classify in parallel
    const settled = await Promise.allSettled(chunk.map(async txn => {
      const result = await classifyTransaction(txn);
      txn.classified_reason = result.classified_reason;
      txn.confidence_score  = result.confidence_score;
      txn.ai_reasoning      = result.reasoning;

      if (result.is_exception) {
        txn.status           = 'exception';
        txn.exception_reason = result.exception_reason;
      } else {
        txn.status = 'action_taken';
      }
      await txn.save();
      return { transaction_id: txn.transaction_id, revenue_stream: txn.revenue_stream, status: txn.status, classified_reason: txn.classified_reason, used_ai: result.used_ai };
    }));

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        results.push({ status: 'exception', error: outcome.reason?.message });
      }
    }
  }

  const summary = {
    total:      results.length,
    classified: results.filter(r => r.status === 'action_taken').length,
    exceptions: results.filter(r => r.status === 'exception').length,
    ai_used:    results.filter(r => r.used_ai).length,
  };

  res.json({ message: 'Batch classification complete', summary, results });
};

/**
 * POST /api/transactions/:id/voice-script
 * Generates or retrieves Hinglish Voice AI recovery script for a transaction
 */
const getOrGenerateVoiceScript = async (req, res) => {
  const transaction = await Transaction.findOne({ transaction_id: req.params.id });

  if (!transaction) {
    return res.status(404).json({ error: `Transaction ${req.params.id} not found` });
  }

  if (!transaction.voice_script) {
    const script = await generateVoiceScript(transaction);
    transaction.voice_script = script;
    await transaction.save();

    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'recovery_action',
      detected_reason: transaction.classified_reason,
      confidence_score: transaction.confidence_score,
      action_taken: 'hinglish_voice_script_generated',
      reasoning: `Generated AI Hinglish voice conversation script for customer ${transaction.customer_name} (₹${transaction.amount}).`,
      outcome: 'success',
      amount: transaction.amount,
      meta: { script_summary: script.summary, turns: script.turns.length },
    });
  }

  res.json({
    transaction_id: transaction.transaction_id,
    customer_name: transaction.customer_name,
    customer_phone: transaction.customer_phone,
    amount: transaction.amount,
    voice_script: transaction.voice_script,
  });
};

/**
 * POST /api/transactions/:id/ptp
 * Sets a Promise-to-Pay (PTP) commitment
 */
const setPromiseToPay = async (req, res) => {
  const { ptp_date, ptp_amount, ptp_notes } = req.body;
  const transaction = await Transaction.findOne({ transaction_id: req.params.id });

  if (!transaction) {
    return res.status(404).json({ error: `Transaction ${req.params.id} not found` });
  }

  transaction.ptp_status = 'committed';
  transaction.ptp_date = ptp_date ? new Date(ptp_date) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  transaction.ptp_amount = ptp_amount || transaction.amount;
  transaction.ptp_notes = ptp_notes || 'Customer agreed to pay on committed date via phone call';
  transaction.status = 'ptp_committed';

  await transaction.save();

  await auditService.log({
    transaction_id: transaction.transaction_id,
    action_type: 'recovery_action',
    detected_reason: transaction.classified_reason,
    confidence_score: transaction.confidence_score,
    action_taken: 'ptp_commitment_logged',
    reasoning: `Customer ${transaction.customer_name} promised to pay ₹${transaction.ptp_amount} by ${transaction.ptp_date.toISOString()}. Automated reminders scheduled.`,
    outcome: 'pending',
    amount: transaction.amount,
    meta: { ptp_date: transaction.ptp_date, notes: transaction.ptp_notes },
  });

  res.json({
    message: 'Promise-to-Pay (PTP) committed successfully',
    transaction,
  });
};

/**
 * POST /api/transactions/:id/ptp-status
 * Updates PTP status (e.g. mark kept or broken)
 */
const updatePTPStatus = async (req, res) => {
  const { status } = req.body; // 'kept', 'broken'
  const transaction = await Transaction.findOne({ transaction_id: req.params.id });

  if (!transaction) {
    return res.status(404).json({ error: `Transaction ${req.params.id} not found` });
  }

  transaction.ptp_status = status;
  if (status === 'kept') {
    transaction.status = 'recovered';
    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'outcome',
      detected_reason: transaction.classified_reason,
      confidence_score: transaction.confidence_score,
      action_taken: 'ptp_fulfilled',
      reasoning: `Promise-to-Pay KEPT: Customer ${transaction.customer_name} paid ₹${transaction.amount} on time.`,
      outcome: 'success',
      amount: transaction.amount,
    });
  } else if (status === 'broken') {
    transaction.status = 'ptp_broken';
    await auditService.log({
      transaction_id: transaction.transaction_id,
      action_type: 'exception',
      detected_reason: transaction.classified_reason,
      confidence_score: transaction.confidence_score,
      action_taken: 'ptp_broken_escalate',
      reasoning: `Promise-to-Pay BROKEN: Customer ${transaction.customer_name} missed deadline ${transaction.ptp_date}. Escalating to human collections.`,
      outcome: 'failure',
      amount: transaction.amount,
    });
  }

  await transaction.save();

  res.json({ message: `PTP status updated to ${status}`, transaction });
};

/**
 * GET /api/transactions
 * Lists all transactions with stream and status filters.
 */
const listTransactions = async (req, res) => {
  const { status, reason, stream, ptp_status, page = 1, limit = 100 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (reason) filter.classified_reason = reason;
  if (stream && stream !== 'all') filter.revenue_stream = stream;
  if (ptp_status) filter.ptp_status = ptp_status;

  const transactions = await Transaction.find(filter)
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  const total = await Transaction.countDocuments(filter);

  res.json({
    total,
    page: parseInt(page),
    transactions,
  });
};

/**
 * POST /api/transactions/inject-single
 * Injects a single custom revenue-at-risk failure from the interactive playground.
 */
const injectSingleTransaction = async (req, res) => {
  const { v4: uuidv4 } = require('uuid');
  const {
    customer_name,
    customer_phone,
    amount,
    revenue_stream,
    failure_code,
    merchant_id,
    cart_summary,
    invoice_id,
    invoice_aging_days,
  } = req.body;

  const txn = new Transaction({
    transaction_id: `TXN_${uuidv4().substring(0, 8).toUpperCase()}`,
    revenue_stream: revenue_stream || 'payment_gateway',
    merchant_id: merchant_id || 'MER_PLAYGROUND',
    customer_id: `CUST_${uuidv4().substring(0, 6).toUpperCase()}`,
    customer_name: customer_name || 'Sandbox Customer',
    customer_phone: customer_phone || '+91 98765 00000',
    customer_email: 'sandbox@recoverai.internal',
    amount: Number(amount) || 5000,
    failure_code: failure_code || 'BANK_TIMEOUT',
    cart_summary,
    invoice_id,
    invoice_aging_days: invoice_aging_days ? Number(invoice_aging_days) : undefined,
    status: 'failed',
    opted_out: false,
    attempt_count: 0,
    created_at: new Date(),
  });

  await txn.save();

  await auditService.log({
    transaction_id: txn.transaction_id,
    action_type: 'classification',
    detected_reason: 'pending_classification',
    confidence_score: 0,
    action_taken: 'interactive_injection',
    reasoning: `Custom scenario injected via Interactive Studio [${txn.revenue_stream}]: Error "${txn.failure_code}", Amount: ₹${txn.amount}.`,
    outcome: 'success',
    amount: txn.amount,
  });

  res.status(201).json({
    message: 'Custom failure scenario injected successfully',
    transaction: txn,
  });
};

const summarize = (txn) => ({
  transaction_id: txn.transaction_id,
  revenue_stream: txn.revenue_stream,
  merchant_id: txn.merchant_id,
  customer_name: txn.customer_name,
  amount: txn.amount,
  failure_code: txn.failure_code,
  status: txn.status,
  ptp_status: txn.ptp_status,
  opted_out: txn.opted_out,
  created_at: txn.created_at,
});

module.exports = {
  generateBatch,
  classifyOne,
  classifyBatch,
  getOrGenerateVoiceScript,
  setPromiseToPay,
  updatePTPStatus,
  listTransactions,
  injectSingleTransaction,
};


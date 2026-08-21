const Transaction = require('../models/Transaction');
const { generateTransactions } = require('../utils/syntheticDataGenerator');
const { classifyTransaction } = require('../services/classificationService');

/**
 * Transaction Controller
 * Handles: generate, list, and single-transaction classification
 */

/**
 * POST /api/transactions/generate
 * Generates a batch of synthetic failed transactions and saves to DB.
 */
const generateBatch = async (req, res) => {
  const count = parseInt(req.body.count || req.query.count || 50, 10);

  if (count < 1 || count > 500) {
    return res.status(400).json({ error: 'count must be between 1 and 500' });
  }

  // Clear existing transactions for a clean demo run
  await Transaction.deleteMany({});

  const transactionData = generateTransactions(count);
  const transactions = await Transaction.insertMany(transactionData);

  res.status(201).json({
    message: `Generated ${transactions.length} synthetic failed transactions`,
    count: transactions.length,
    transactions: transactions.map(summarize),
  });
};

/**
 * POST /api/transactions/:id/classify
 * Classifies a single transaction (rule-based or AI).
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

  // Mark as classifying
  transaction.status = 'classifying';
  await transaction.save();

  const result = await classifyTransaction(transaction);

  // Update transaction with classification results
  transaction.classified_reason = result.classified_reason;
  transaction.confidence_score = result.confidence_score;
  transaction.ai_reasoning = result.reasoning;

  if (result.is_exception) {
    transaction.status = 'exception';
    transaction.exception_reason = result.exception_reason;
  } else {
    transaction.status = 'action_taken'; // Ready for recovery
  }

  await transaction.save();

  res.json({
    transaction_id: transaction.transaction_id,
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
 * Classifies all "failed" transactions.
 */
const classifyBatch = async (req, res) => {
  const failedTransactions = await Transaction.find({ status: 'failed' });

  if (failedTransactions.length === 0) {
    return res.json({ message: 'No failed transactions to classify', results: [] });
  }

  const results = [];

  for (const txn of failedTransactions) {
    txn.status = 'classifying';
    await txn.save();

    try {
      const result = await classifyTransaction(txn);

      txn.classified_reason = result.classified_reason;
      txn.confidence_score = result.confidence_score;
      txn.ai_reasoning = result.reasoning;

      if (result.is_exception) {
        txn.status = 'exception';
        txn.exception_reason = result.exception_reason;
      } else {
        txn.status = 'action_taken';
      }

      await txn.save();
      results.push({ transaction_id: txn.transaction_id, status: txn.status, classified_reason: txn.classified_reason, used_ai: result.used_ai });
    } catch (err) {
      txn.status = 'exception';
      txn.exception_reason = `Unexpected error during classification: ${err.message}`;
      await txn.save();
      results.push({ transaction_id: txn.transaction_id, status: 'exception', error: err.message });
    }
  }

  const summary = {
    total: results.length,
    classified: results.filter(r => r.status === 'action_taken').length,
    exceptions: results.filter(r => r.status === 'exception').length,
    ai_used: results.filter(r => r.used_ai).length,
  };

  res.json({ message: 'Batch classification complete', summary, results });
};

/**
 * GET /api/transactions
 * Lists all transactions with optional filters.
 */
const listTransactions = async (req, res) => {
  const { status, reason, page = 1, limit = 100 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (reason) filter.classified_reason = reason;

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

// ── Helpers ──────────────────────────────────────────────────────────────────

const summarize = (txn) => ({
  transaction_id: txn.transaction_id,
  merchant_id: txn.merchant_id,
  amount: txn.amount,
  failure_code: txn.failure_code,
  status: txn.status,
  opted_out: txn.opted_out,
  created_at: txn.created_at,
});

module.exports = { generateBatch, classifyOne, classifyBatch, listTransactions };

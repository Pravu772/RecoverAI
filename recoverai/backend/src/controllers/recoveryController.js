const Transaction = require('../models/Transaction');
const { executeRecovery } = require('../services/recoveryService');
const auditService = require('../services/auditService');

/**
 * Recovery Controller
 * Handles: single-transaction recovery and batch recovery
 */

/**
 * POST /api/transactions/:id/recover
 * Executes the recovery action for a single classified transaction.
 */
const recoverOne = async (req, res) => {
  const transaction = await Transaction.findOne({ transaction_id: req.params.id });

  if (!transaction) {
    return res.status(404).json({ error: `Transaction ${req.params.id} not found` });
  }

  // Only classified transactions can be recovered
  const recoverableStatuses = ['action_taken', 'failed'];
  if (!recoverableStatuses.includes(transaction.status) && !transaction.opted_out) {
    return res.status(400).json({
      error: `Transaction status "${transaction.status}" is not eligible for recovery`,
      status: transaction.status,
    });
  }

  const result = await executeRecovery(transaction);

  // Update transaction fields based on result
  transaction.status = result.new_status;
  transaction.recovery_action = result.action_taken !== 'none' ? result.action_taken : transaction.recovery_action;

  if (result.action_taken !== 'none') {
    transaction.attempt_count += 1;
  }

  if (result.next_eligible_action_at) {
    transaction.next_eligible_action_at = result.next_eligible_action_at;
  }

  await transaction.save();

  res.json({
    transaction_id: transaction.transaction_id,
    new_status: transaction.status,
    action_taken: result.action_taken,
    attempt_count: transaction.attempt_count,
    recovered: result.success,
    reasoning: result.reasoning,
    next_eligible_action_at: transaction.next_eligible_action_at,
  });
};

/**
 * POST /api/transactions/recover-batch
 * Runs recovery for all classified (action_taken status) transactions in parallel chunks.
 */
const recoverBatch = async (req, res) => {
  // Find all transactions ready for recovery
  const eligibleTransactions = await Transaction.find({
    status: { $in: ['action_taken', 'failed'] },
    opted_out: false,
  });

  if (eligibleTransactions.length === 0) {
    return res.json({
      message: 'No eligible transactions for recovery. Run classify-batch first.',
      results: [],
    });
  }

  const results = [];
  let totalRecovered = 0;
  let totalAmountRecovered = 0;
  const CHUNK_SIZE = 15;

  for (let i = 0; i < eligibleTransactions.length; i += CHUNK_SIZE) {
    const chunk = eligibleTransactions.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.all(chunk.map(async (txn) => {
      try {
        const result = await executeRecovery(txn, { isBatch: true });

        txn.status = result.new_status;
        if (result.action_taken !== 'none') {
          txn.recovery_action = result.action_taken;
          txn.attempt_count += 1;
        }
        if (result.next_eligible_action_at) {
          txn.next_eligible_action_at = result.next_eligible_action_at;
        }
        if (result.voice_script) {
          txn.voice_script = result.voice_script;
        }
        if (result.ptp_status && result.ptp_status !== 'none') {
          txn.ptp_status = result.ptp_status;
          txn.ptp_date = result.ptp_date;
          txn.ptp_amount = result.ptp_amount;
          txn.ptp_notes = result.ptp_notes;
        }

        await txn.save();

        if (result.success) {
          totalRecovered++;
          totalAmountRecovered += txn.amount;
        }

        return {
          transaction_id: txn.transaction_id,
          amount: txn.amount,
          action_taken: result.action_taken,
          new_status: txn.status,
          recovered: result.success,
        };
      } catch (err) {
        console.error(`Recovery error for ${txn.transaction_id}:`, err.message);
        return {
          transaction_id: txn.transaction_id,
          error: err.message,
          new_status: 'exception',
        };
      }
    }));

    results.push(...chunkResults);
  }

  const summary = {
    total_processed: results.length,
    recovered_count: totalRecovered,
    recovered_amount: totalAmountRecovered,
    recovery_rate: results.length > 0
      ? ((totalRecovered / results.length) * 100).toFixed(1)
      : '0.0',
    pending_human: results.filter(r => r.new_status === 'pending_human').length,
    max_retries: results.filter(r => r.new_status === 'max_retries_reached').length,
    still_failing: results.filter(r => r.new_status === 'action_taken').length,
  };

  res.json({ message: 'Batch recovery complete', summary, results });
};

module.exports = { recoverOne, recoverBatch };

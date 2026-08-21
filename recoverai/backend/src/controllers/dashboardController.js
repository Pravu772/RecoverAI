const Transaction = require('../models/Transaction');
const auditService = require('../services/auditService');

/**
 * Dashboard Controller
 * Provides aggregate metrics for the RecoverAI dashboard.
 */

/**
 * GET /api/dashboard/summary
 * Returns high-level recovery metrics and breakdown by failure reason.
 */
const getSummary = async (req, res) => {
  // Aggregate all transactions
  const allTransactions = await Transaction.find({}).lean();

  const total_transactions = allTransactions.length;

  if (total_transactions === 0) {
    return res.json({
      total_transactions: 0,
      total_amount_at_risk: 0,
      total_recovered_amount: 0,
      recovery_rate_percent: 0,
      exceptions_count: 0,
      pending_human_count: 0,
      max_retries_count: 0,
      opted_out_count: 0,
      breakdown_by_reason: {},
      status_breakdown: {},
    });
  }

  const total_amount_at_risk = allTransactions.reduce((sum, t) => sum + t.amount, 0);

  const recovered = allTransactions.filter(t => t.status === 'recovered');
  const total_recovered_amount = recovered.reduce((sum, t) => sum + t.amount, 0);

  const recovery_rate_percent = total_transactions > 0
    ? parseFloat(((recovered.length / total_transactions) * 100).toFixed(1))
    : 0;

  const exceptions_count = allTransactions.filter(t => t.status === 'exception').length;
  const pending_human_count = allTransactions.filter(t => t.status === 'pending_human').length;
  const max_retries_count = allTransactions.filter(t => t.status === 'max_retries_reached').length;
  const opted_out_count = allTransactions.filter(t => t.status === 'opted_out').length;

  // Breakdown by classified_reason
  const reasons = ['insufficient_funds', 'card_expired', 'bank_timeout', 'mandate_expired', 'network_error', 'unknown'];
  const breakdown_by_reason = {};

  for (const reason of reasons) {
    const group = allTransactions.filter(t => t.classified_reason === reason);
    const groupRecovered = group.filter(t => t.status === 'recovered');
    const groupAmount = group.reduce((sum, t) => sum + t.amount, 0);
    const groupRecoveredAmount = groupRecovered.reduce((sum, t) => sum + t.amount, 0);

    breakdown_by_reason[reason] = {
      total: group.length,
      recovered: groupRecovered.length,
      amount_at_risk: groupAmount,
      amount_recovered: groupRecoveredAmount,
      recovery_rate: group.length > 0
        ? parseFloat(((groupRecovered.length / group.length) * 100).toFixed(1))
        : 0,
    };
  }

  // Status breakdown
  const statusCounts = {};
  for (const txn of allTransactions) {
    statusCounts[txn.status] = (statusCounts[txn.status] || 0) + 1;
  }

  res.json({
    total_transactions,
    total_amount_at_risk,
    total_recovered_amount,
    recovery_rate_percent,
    exceptions_count,
    pending_human_count,
    max_retries_count,
    opted_out_count,
    breakdown_by_reason,
    status_breakdown: statusCounts,
  });
};

/**
 * GET /api/audit/:transaction_id
 * Returns the full audit trail for a specific transaction.
 */
const getAuditTrail = async (req, res) => {
  const { transaction_id } = req.params;

  const transaction = await Transaction.findOne({ transaction_id }).lean();
  if (!transaction) {
    return res.status(404).json({ error: `Transaction ${transaction_id} not found` });
  }

  const trail = await auditService.getTrail(transaction_id);

  res.json({
    transaction,
    audit_trail: trail,
  });
};

module.exports = { getSummary, getAuditTrail };

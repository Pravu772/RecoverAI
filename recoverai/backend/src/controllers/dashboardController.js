const Transaction = require('../models/Transaction');
const auditService = require('../services/auditService');

/**
 * Dashboard Controller
 * Provides aggregate metrics for the RecoverAI multi-stream revenue recovery dashboard.
 */

const getSummary = async (req, res) => {
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
      ptp_committed_count: 0,
      ptp_committed_amount: 0,
      breakdown_by_stream: {},
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
  const opted_out_count = allTransactions.filter(t => t.status === 'opted_out' || t.opted_out).length;
  const ptp_broken_count = allTransactions.filter(t => t.status === 'ptp_broken' || t.ptp_status === 'broken').length;

  // PTP metrics
  const ptp_committed_txns = allTransactions.filter(t => ['committed', 'kept'].includes(t.ptp_status));
  const ptp_committed_count = ptp_committed_txns.length;
  const ptp_committed_amount = ptp_committed_txns.reduce((sum, t) => sum + (t.ptp_amount || t.amount), 0);

  // Breakdown by Revenue Stream
  const streams = ['payment_gateway', 'checkout_abandonment', 'subscription_renewal', 'b2b_invoice'];
  const breakdown_by_stream = {};

  for (const st of streams) {
    const group = allTransactions.filter(t => t.revenue_stream === st);
    const groupRecovered = group.filter(t => t.status === 'recovered');
    const groupAmount = group.reduce((sum, t) => sum + t.amount, 0);
    const groupRecoveredAmount = groupRecovered.reduce((sum, t) => sum + t.amount, 0);

    breakdown_by_stream[st] = {
      total: group.length,
      recovered: groupRecovered.length,
      amount_at_risk: groupAmount,
      amount_recovered: groupRecoveredAmount,
      recovery_rate: group.length > 0
        ? parseFloat(((groupRecovered.length / group.length) * 100).toFixed(1))
        : 0,
    };
  }

  // Breakdown by classified_reason
  const reasons = [
    'insufficient_funds', 'card_expired', 'bank_timeout', 'mandate_expired',
    'network_error', 'checkout_hesitation', 'otp_dropoff', 'invoice_overdue_30d',
    'invoice_overdue_60d', 'subscription_failed_billing', 'unknown'
  ];
  const breakdown_by_reason = {};

  for (const reason of reasons) {
    const group = allTransactions.filter(t => t.classified_reason === reason);
    const groupRecovered = group.filter(t => t.status === 'recovered');
    const groupAmount = group.reduce((sum, t) => sum + t.amount, 0);
    const groupRecoveredAmount = groupRecovered.reduce((sum, t) => sum + t.amount, 0);

    if (group.length > 0) {
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
    ptp_broken_count,
    ptp_committed_count,
    ptp_committed_amount,
    breakdown_by_stream,
    breakdown_by_reason,
    status_breakdown: statusCounts,
  });
};

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


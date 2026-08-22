/**
 * Netflix Synthetic Profile — Subscriptions Only
 * 100% subscription failure stream, recurring billing pattern (₹199 - ₹799, avg ₹649).
 * ZERO cart drops, ZERO B2B invoices.
 * Dominant failure reasons: mandate_expired, card_expired, insufficient_funds. High PTP volume.
 */
export const netflixProfile = {
  id: 'MER_NETFLIX',
  name: 'Netflix Streaming India',
  tier: 'Subscriptions Plus (100% Recurring OTT)',
  industry: 'Digital Entertainment & Media OTT',
  logoText: 'NF',
  currency: 'INR',
  period: 'August 2026 (Monthly Batch M-08)',
  stats: {
    total_transactions: 130,
    total_amount_at_risk: 84370,
    total_recovered_amount: 59059,
    recovery_rate_percent: 70.0,
    prior_period_rate: 61.8,
    rate_delta: '+8.2%',
    avg_ticket_size: 649,
    projected_next_period_at_risk: 88000,
    projection_note: 'Illustrative projection based on monthly 1st-of-month auto-debit cycle volumes',
  },
  operating_costs: {
    sms_count: 35,
    sms_cost: 17.5,       // ₹0.50 each
    whatsapp_count: 20,
    whatsapp_cost: 15.0,  // ₹0.75 each
    email_count: 70,
    email_cost: 7.0,      // ₹0.10 each
    payday_triggers: 50,
    payday_cost: 10.0,    // ₹0.20 each
    total_ops_cost: 49.5,
    net_yield_amount: 59009.5,
    roi_multiplier: '1192x',
  },
  streams: [
    {
      stream_id: 'subscription_renewal',
      stream_name: 'Monthly Recurring OTT Subscriptions (Mobile, Standard, Premium)',
      at_risk: 84370,
      recovered: 59059,
      recovery_rate: 70.0,
      dominant_action: 'Smart Payday Sequencer (1st/5th) + Email Alternate Card Link',
      status: 'active',
    },
  ],
  top_failure_drivers: [
    {
      reason: 'mandate_expired',
      label: 'Expired UPI E-Mandate / Recurring Autopay',
      impact_amount: 42200,
      txn_count: 65,
      recovery_pct: 73.8,
      mitigation: 'Smart auto-resubmission aligned with salary deposit cycles',
    },
    {
      reason: 'card_expired',
      label: 'Card Expiry / Replaced Debit Card',
      impact_amount: 26600,
      txn_count: 41,
      recovery_pct: 68.3,
      mitigation: 'Immediate email + in-app card update workflow',
    },
    {
      reason: 'insufficient_funds',
      label: 'Temporary Balance Shortfall on Renewal Date',
      impact_amount: 15570,
      txn_count: 24,
      recovery_pct: 66.7,
      mitigation: '72h retry cadence with promise-to-pay grace period',
    },
  ],
  compliance_note: '100% compliant with RBI e-Mandate circular (CO.DPSS.POLC.No.S-518/02.14.003/2020-21) including 24-hr pre-debit notifications.',
};

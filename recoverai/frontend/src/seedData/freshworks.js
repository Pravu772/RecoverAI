/**
 * Freshworks Synthetic Profile — B2B Enterprise SaaS
 * Low volume (22 txns), very HIGH average order value (₹15,000 - ₹3,80,000, avg ~₹98,500).
 * Dominant failure reasons: invoice_overdue_30d, invoice_overdue_60d, mandate_expired.
 * Dominant stream: b2b_invoice (75%) and subscription_renewal (25% enterprise ACH/NACH).
 * ZERO cart drops, ZERO food gateway drops.
 */
export const freshworksProfile = {
  id: 'MER_FRESHWORKS',
  name: 'Freshworks B2B SaaS',
  tier: 'B2B Enterprise Net-60 (High-AOV Global Accounts)',
  industry: 'Enterprise Software & SaaS CRM',
  logoText: 'FW',
  currency: 'INR',
  period: 'August 2026 (Monthly Batch M-08)',
  stats: {
    total_transactions: 22,
    total_amount_at_risk: 2167000,
    total_recovered_amount: 1538570,
    recovery_rate_percent: 71.0,
    prior_period_rate: 61.5,
    rate_delta: '+9.5%',
    avg_ticket_size: 98500,
    projected_next_period_at_risk: 2450000,
    projection_note: 'Illustrative projection based on Q3 enterprise software contract renewal schedules',
  },
  operating_costs: {
    voice_count: 18,
    voice_cost: 36.0,     // ₹2.00 each
    dunning_count: 10,
    dunning_cost: 15.0,   // ₹1.50 each
    email_count: 35,
    email_cost: 3.5,      // ₹0.10 each
    total_ops_cost: 54.5,
    net_yield_amount: 1538515.5,
    roi_multiplier: '28229x',
  },
  streams: [
    {
      stream_id: 'b2b_invoice',
      stream_name: 'Overdue Enterprise Net-30 / Net-60 Invoices',
      at_risk: 1625250,
      recovered: 1170180,
      recovery_rate: 72.0,
      dominant_action: 'Empathetic Hinglish Voice AI Follow-up + Formal PTP Agreement',
      status: 'active',
    },
    {
      stream_id: 'subscription_renewal',
      stream_name: 'Annual Enterprise ACH / NACH Mandates',
      at_risk: 541750,
      recovered: 368390,
      recovery_rate: 68.0,
      dominant_action: 'Finance Team Escalation + Pre-settlement ACH Resubmission',
      status: 'active',
    },
  ],
  top_failure_drivers: [
    {
      reason: 'invoice_overdue_60d',
      label: 'Delinquent Net-60 Accounts Payable Delay',
      impact_amount: 1180000,
      txn_count: 11,
      recovery_pct: 72.7,
      mitigation: 'Voice AI telephonic PTP collection agreement with split installments',
    },
    {
      reason: 'invoice_overdue_30d',
      label: 'Net-30 Invoice Processing & Approval Queue Delay',
      impact_amount: 650000,
      txn_count: 7,
      recovery_pct: 71.4,
      mitigation: 'Automated executive dunning email with 1-click RTGS/NEFT link',
    },
    {
      reason: 'mandate_expired',
      label: 'Enterprise NACH / ACH Corporate Mandate Expiry',
      impact_amount: 337000,
      txn_count: 4,
      recovery_pct: 66.7,
      mitigation: 'Direct procurement contact re-authorization workflow',
    },
  ],
  compliance_note: 'B2B collection procedures comply with Companies Act 2013, MSME Payment Guidelines, and strict anti-harassment covenants.',
};

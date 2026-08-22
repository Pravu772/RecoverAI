/**
 * Flipkart Synthetic Profile — Global E-Commerce & Big Billion Days
 * Higher average order value (₹500 - ₹18,500).
 * Dominant failure reasons: card_expired, mandate_expired (EMI/BNPL), checkout_hesitation.
 */
export const flipkartProfile = {
  id: 'MER_FLIPKART',
  name: 'Flipkart Global Commerce',
  tier: 'Enterprise Tier-1 (High-AOV Omnichannel)',
  industry: 'E-Commerce & Retail Marketplace',
  logoText: 'FK',
  currency: 'INR',
  period: 'August 2026 (Monthly Batch M-08)',
  stats: {
    total_transactions: 95,
    total_amount_at_risk: 365750,
    total_recovered_amount: 226765,
    recovery_rate_percent: 62.0,
    prior_period_rate: 55.6,
    rate_delta: '+6.4%',
    avg_ticket_size: 3850,
    projected_next_period_at_risk: 410000,
    projection_note: 'Illustrative projection anticipating Big Billion Days seasonal sale event burst',
  },
  operating_costs: {
    sms_count: 40,
    sms_cost: 20.0,       // ₹0.50 each
    whatsapp_count: 65,
    whatsapp_cost: 48.75, // ₹0.75 each
    voice_count: 20,
    voice_cost: 40.0,     // ₹2.00 each
    email_count: 45,
    email_cost: 4.5,      // ₹0.10 each
    total_ops_cost: 113.25,
    net_yield_amount: 226651.75,
    roi_multiplier: '2001x',
  },
  streams: [
    {
      stream_id: 'checkout_abandonment',
      stream_name: 'High-Value Electronics Cart Drops',
      at_risk: 219450,
      recovered: 138253,
      recovery_rate: 63.0,
      dominant_action: '1-Click WhatsApp Pre-filled Cart with Reserved Stock',
      status: 'active',
    },
    {
      stream_id: 'payment_gateway',
      stream_name: 'Credit Card & No-Cost EMI Declines',
      at_risk: 109725,
      recovered: 66932,
      recovery_rate: 61.0,
      dominant_action: 'Alternate Card Failover + Alternate Payment Link',
      status: 'active',
    },
    {
      stream_id: 'subscription_renewal',
      stream_name: 'Flipkart VIP / Plus Memberships',
      at_risk: 36575,
      recovered: 21580,
      recovery_rate: 59.0,
      dominant_action: 'Smart Payday E-Mandate Resubmission',
      status: 'active',
    },
  ],
  top_failure_drivers: [
    {
      reason: 'card_expired',
      label: 'Expired Saved Card Tokens & CVV Validation',
      impact_amount: 158000,
      txn_count: 36,
      recovery_pct: 63.8,
      mitigation: 'Interactive email/SMS card replacement portal',
    },
    {
      reason: 'mandate_expired',
      label: 'Expired EMI / BNPL Auto-Debit Mandates',
      impact_amount: 124000,
      txn_count: 32,
      recovery_pct: 62.5,
      mitigation: 'Smart auto-debit retry synchronized with salary deposit',
    },
    {
      reason: 'checkout_hesitation',
      label: 'High-Ticket Cart Hesitation (> ₹10,000)',
      impact_amount: 83750,
      txn_count: 27,
      recovery_pct: 59.2,
      mitigation: 'Contextual WhatsApp cart recovery with 60-min hold',
    },
  ],
  compliance_note: 'BNPL and EMI interest compliance audited under RBI Digital Lending Guidelines. Zero dark patterns.',
};

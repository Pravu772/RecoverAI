/**
 * Swiggy Synthetic Profile — Food Delivery & Instamart
 * High frequency, low average order value (₹150 - ₹850).
 * Dominant failure reasons: insufficient_funds, network_error, bank_timeout.
 */
export const swiggyProfile = {
  id: 'MER_SWIGGY',
  name: 'Swiggy Food & Instamart',
  tier: 'Enterprise Tier-1 (High-Velocity B2C)',
  industry: 'Food & Quick Commerce',
  logoText: 'SW',
  currency: 'INR',
  period: 'August 2026 (Monthly Batch M-08)',
  stats: {
    total_transactions: 140,
    total_amount_at_risk: 53900,
    total_recovered_amount: 34500,
    recovery_rate_percent: 64.0,
    prior_period_rate: 58.9,
    rate_delta: '+5.1%',
    avg_ticket_size: 385,
    projected_next_period_at_risk: 58000,
    projection_note: 'Illustrative projection based on weekend & dinner rush transaction volume',
  },
  operating_costs: {
    sms_count: 72,
    sms_cost: 36.0,       // ₹0.50 each
    whatsapp_count: 48,
    whatsapp_cost: 36.0,  // ₹0.75 each
    voice_count: 20,
    voice_cost: 40.0,     // ₹2.00 each
    total_ops_cost: 112.0,
    net_yield_amount: 34388,
    roi_multiplier: '307x',
  },
  streams: [
    {
      stream_id: 'payment_gateway',
      stream_name: 'Payment Gateway Drops (UPI / Cards)',
      at_risk: 32400,
      recovered: 21060,
      recovery_rate: 65.0,
      dominant_action: 'Alternate Gateway Failover + Auto-Retry',
      status: 'active',
    },
    {
      stream_id: 'checkout_abandonment',
      stream_name: 'Instamart Cart Drop-offs',
      at_risk: 14500,
      recovered: 8700,
      recovery_rate: 60.0,
      dominant_action: '1-Click WhatsApp Pre-filled Order Link',
      status: 'active',
    },
    {
      stream_id: 'subscription_renewal',
      stream_name: 'Swiggy One Membership Renewals',
      at_risk: 7000,
      recovered: 4740,
      recovery_rate: 67.7,
      dominant_action: 'Smart Payday Debit + Hinglish Voice AI',
      status: 'active',
    },
  ],
  top_failure_drivers: [
    {
      reason: 'insufficient_funds',
      label: 'UPI / Account Insufficient Funds',
      impact_amount: 24800,
      txn_count: 64,
      recovery_pct: 62.5,
      mitigation: '48h smart retry aligned with balance recharge',
    },
    {
      reason: 'network_error',
      label: 'Mobile Handshake & Network Timeout',
      impact_amount: 16400,
      txn_count: 46,
      recovery_pct: 71.7,
      mitigation: 'Immediate secondary gateway switch',
    },
    {
      reason: 'bank_timeout',
      label: 'Issuer Bank Gateway Latency Spikes',
      impact_amount: 12700,
      txn_count: 30,
      recovery_pct: 56.6,
      mitigation: 'Exponential backoff with 15-min cooldown',
    },
  ],
  compliance_note: 'All 140 recovery dispatches verified under RBI auto-debit circular and TRAI DND bounds. 0 policy violations.',
};

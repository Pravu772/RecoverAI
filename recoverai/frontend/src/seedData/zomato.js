/**
 * Zomato Synthetic Profile — Dining & Delivery + Restaurant Partner Payouts
 * Moderate order value (₹250 - ₹3,200), mix of B2C carts and B2B merchant receivables.
 * Dominant failure reasons: otp_dropoff, checkout_hesitation, bank_timeout.
 */
export const zomatoProfile = {
  id: 'MER_ZOMATO',
  name: 'Zomato Dining & Delivery',
  tier: 'Enterprise Tier-1 (Food & Dining + Merchant B2B)',
  industry: 'Food Delivery & Dining Out',
  logoText: 'ZM',
  logo: '/logos/zomato.png',
  currency: 'INR',
  period: 'August 2026 (Monthly Batch M-08)',
  stats: {
    total_transactions: 110,
    total_amount_at_risk: 70400,
    total_recovered_amount: 41536,
    recovery_rate_percent: 59.0,
    prior_period_rate: 55.2,
    rate_delta: '+3.8%',
    avg_ticket_size: 640,
    projected_next_period_at_risk: 74000,
    projection_note: 'Illustrative projection factoring weekend dining reservation surges',
  },
  operating_costs: {
    sms_count: 55,
    sms_cost: 27.5,       // ₹0.50 each
    whatsapp_count: 50,
    whatsapp_cost: 37.5,  // ₹0.75 each
    voice_count: 15,
    voice_cost: 30.0,     // ₹2.00 each
    total_ops_cost: 95.0,
    net_yield_amount: 41441,
    roi_multiplier: '436x',
  },
  streams: [
    {
      stream_id: 'payment_gateway',
      stream_name: 'Online Delivery Checkout Failures',
      at_risk: 35200,
      recovered: 21824,
      recovery_rate: 62.0,
      dominant_action: 'Instant Gateway Reroute + Card Token Retry',
      status: 'active',
    },
    {
      stream_id: 'checkout_abandonment',
      stream_name: 'Zomato Gold / Dining Drop-offs',
      at_risk: 21120,
      recovered: 11827,
      recovery_rate: 56.0,
      dominant_action: '1-Click WhatsApp Dining Reservation Link',
      status: 'active',
    },
    {
      stream_id: 'b2b_invoice',
      stream_name: 'Restaurant Partner Commission Receivables',
      at_risk: 14080,
      recovered: 7885,
      recovery_rate: 56.0,
      dominant_action: 'Automated Merchant Dunning & Hinglish Voice Follow-up',
      status: 'active',
    },
  ],
  top_failure_drivers: [
    {
      reason: 'otp_dropoff',
      label: '2-Factor OTP SMS Latency Drop-offs',
      impact_amount: 28500,
      txn_count: 42,
      recovery_pct: 61.9,
      mitigation: 'Fallback to WhatsApp OTP verification link',
    },
    {
      reason: 'checkout_hesitation',
      label: 'Cart Abandonment at Payment Step',
      impact_amount: 24100,
      txn_count: 38,
      recovery_pct: 57.8,
      mitigation: 'Personalized 1-click payment dispatch',
    },
    {
      reason: 'bank_timeout',
      label: 'Core Banking Gateway Latency Timeout',
      impact_amount: 17800,
      txn_count: 30,
      recovery_pct: 56.6,
      mitigation: 'Instant auto-failover to backup acquirer',
    },
  ],
  compliance_note: 'Merchant settlement terms verified in accordance with Indian Payment Aggregator Guidelines (RBI/2020-21/11).',
};

const { v4: uuidv4 } = require('uuid');

/**
 * Multi-Stream Synthetic Revenue-at-Risk Generator
 *
 * Generates realistic revenue recovery data across 4 core business streams:
 *   1. Payment Gateway Failures (40%)
 *   2. Checkout Abandonment (25%)
 *   3. Subscription Renewals (20%)
 *   4. B2B Overdue Invoices (15%)
 */

const CUSTOMER_NAMES = [
  'Rahul Sharma', 'Priya Nair', 'Amit Patel', 'Vikram Malhotra', 'Sneha Rao',
  'Ananya Iyer', 'Rohan Gupta', 'Kavita Menon', 'Siddharth Roy', 'Deepa Reddy',
  'Manish Joshi', 'Pooja Verma', 'Nikhil Mehta', 'Tanvi Deshmukh', 'Arjun Kapoor'
];

const MERCHANTS = [
  'MER_ZOMATO', 'MER_SWIGGY', 'MER_AMAZON', 'MER_FLIPKART', 'MER_NETFLIX',
  'MER_HOTSTAR', 'MER_RAZORPAY_DEMO', 'MER_PAYTM_MALL', 'MER_MYNTRA', 'MER_BIGBASKET',
  'MER_FRESHWORKS_B2B', 'MER_ZOHO_INVOICE'
];

const CART_ITEMS = [
  'Sony WH-1000XM5 Headphones, Anker Fast Charger',
  'Nike Air Zoom Running Shoes (Size 9)',
  'Annual Hotstar Premium + Disney bundle',
  'Office Ergonomic Chair & Laptop Stand',
  'Prestige 3-Burner Gas Stove + Cookware set',
  'Kindle Paperwhite 16GB + Leather Cover',
];

const SUBSCRIPTION_TIERS = [
  'Netflix 4K Ultra HD Plan',
  'Spotify Duo Family Annual',
  'Notion AI Team Plan (5 seats)',
  'Razorpay POS Terminal Monthly Lease',
  'Cult.fit Elite 12-Month Pass'
];

// Helpers
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomPastDate = (days = 30) => new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000);

/**
 * Generates `count` synthetic revenue-at-risk items across all streams.
 */
const generateTransactions = (count = 50) => {
  const transactions = [];

  const optedOutIndices = new Set([3, 11]);
  const ambiguousIndices = new Set([5, 15, 25]);

  for (let i = 0; i < count; i++) {
    // Determine stream distribution
    const roll = Math.random();
    let stream = 'payment_gateway';
    let failure_code = 'BANK_TIMEOUT';
    let amount = randInt(250, 4500);
    let cart_summary = null;
    let invoice_id = null;
    let invoice_aging_days = null;
    let subscription_tier = null;

    if (roll < 0.40) {
      // 1. Payment Gateway Failure
      stream = 'payment_gateway';
      if (ambiguousIndices.has(i)) {
        failure_code = sample(['ERR_declined', 'PAYMENT_ISSUE', 'GATEWAY_DROP_UNKNOWN']);
      } else {
        failure_code = sample(['BANK_TIMEOUT', 'INSUFFICIENT_FUNDS', 'CARD_EXPIRED', 'NETWORK_ERROR']);
      }
      amount = randInt(350, 12000);
    } else if (roll < 0.65) {
      // 2. Checkout Abandonment
      stream = 'checkout_abandonment';
      failure_code = sample(['CHECKOUT_HESITATION_PAYMENT_PAGE', 'OTP_SUBMISSION_DROPOFF', 'PAYMENT_POPUP_CLOSED']);
      amount = randInt(1200, 25000);
      cart_summary = sample(CART_ITEMS);
    } else if (roll < 0.85) {
      // 3. Subscription Renewal
      stream = 'subscription_renewal';
      failure_code = sample(['MANDATE_EXPIRED', 'SUBSCRIPTION_RETRY_FAILED', 'NACH_MANDATE_REVOKED']);
      amount = randInt(499, 5999);
      subscription_tier = sample(SUBSCRIPTION_TIERS);
    } else {
      // 4. B2B Overdue Invoice
      stream = 'b2b_invoice';
      const aging = sample([32, 45, 61, 75, 90]);
      failure_code = aging > 60 ? 'INVOICE_OVERDUE_60D_UNPAID' : 'INVOICE_OVERDUE_30D_UNPAID';
      invoice_aging_days = aging;
      invoice_id = `INV-2026-${randInt(1000, 9999)}`;
      amount = randInt(25000, 250000);
    }

    const custName = sample(CUSTOMER_NAMES);
    const phone = `+91 9${randInt(100000000, 999999999)}`;

    transactions.push({
      transaction_id: `TXN_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
      merchant_id: stream === 'b2b_invoice' ? sample(['MER_FRESHWORKS_B2B', 'MER_ZOHO_INVOICE']) : sample(MERCHANTS),
      amount,
      customer_id: `CUST_${randInt(1000, 9999)}`,
      customer_name: custName,
      customer_phone: phone,
      revenue_stream: stream,
      cart_summary,
      invoice_id,
      invoice_aging_days,
      subscription_tier,
      failure_code,
      classified_reason: null,
      confidence_score: null,
      status: 'failed',
      recovery_action: null,
      ptp_status: 'none',
      ptp_date: null,
      ptp_amount: null,
      ptp_notes: null,
      voice_script: null,
      attempt_count: 0,
      opted_out: optedOutIndices.has(i),
      next_eligible_action_at: null,
      ai_reasoning: null,
      exception_reason: null,
      created_at: randomPastDate(20),
    });
  }

  return transactions;
};

module.exports = { generateTransactions };


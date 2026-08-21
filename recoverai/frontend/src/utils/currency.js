export const CURRENCY_RATES = {
  INR: { symbol: '₹', rate: 1, locale: 'en-IN', label: 'INR (₹)' },
  USD: { symbol: '$', rate: 0.012, locale: 'en-US', label: 'USD ($)' },
  EUR: { symbol: '€', rate: 0.011, locale: 'de-DE', label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.0095, locale: 'en-GB', label: 'GBP (£)' },
};

export const formatCurrency = (amountInINR, currencyKey = 'INR') => {
  const cfg = CURRENCY_RATES[currencyKey] || CURRENCY_RATES.INR;
  const converted = (amountInINR || 0) * cfg.rate;
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: currencyKey,
    maximumFractionDigits: currencyKey === 'INR' ? 0 : 2,
  }).format(converted);
};

import React, { createContext, useContext, useState } from 'react';
import { CURRENCY_RATES, formatCurrency } from '../utils/currency.js';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('INR');

  const formatMoney = (amountInINR) => {
    return formatCurrency(amountInINR, currency);
  };

  const getCurrencySymbol = () => {
    return CURRENCY_RATES[currency]?.symbol || '₹';
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatMoney, getCurrencySymbol, CURRENCY_RATES }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      currency: 'INR',
      setCurrency: () => {},
      formatMoney: (val) => formatCurrency(val, 'INR'),
      getCurrencySymbol: () => '₹',
      CURRENCY_RATES,
    };
  }
  return ctx;
};

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for batch AI classification
  headers: { 'Content-Type': 'application/json' },
});

// ── Response interceptor for global error normalization ───────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.error || err.message || 'Unknown error';
    console.error(`API Error [${err?.response?.status}]:`, message);
    return Promise.reject(new Error(message));
  }
);

// ── Transaction endpoints ─────────────────────────────────────────────────────

export const generateBatch = (count = 50) =>
  api.post('/transactions/generate', { count }).then(r => r.data);

export const classifyBatch = () =>
  api.post('/transactions/classify-batch').then(r => r.data);

export const classifyOne = (id) =>
  api.post(`/transactions/${id}/classify`).then(r => r.data);

export const recoverBatch = () =>
  api.post('/transactions/recover-batch').then(r => r.data);

export const recoverOne = (id) =>
  api.post(`/transactions/${id}/recover`).then(r => r.data);

export const getTransactions = (params = {}) =>
  api.get('/transactions', { params }).then(r => r.data);

// ── Voice AI & PTP endpoints ──────────────────────────────────────────────────

export const getOrGenerateVoiceScript = (id) =>
  api.post(`/transactions/${id}/voice-script`).then(r => r.data);

export const setPromiseToPay = (id, data) =>
  api.post(`/transactions/${id}/ptp`, data).then(r => r.data);

export const updatePTPStatus = (id, status) =>
  api.post(`/transactions/${id}/ptp-status`, { status }).then(r => r.data);

// ── Audit trail ───────────────────────────────────────────────────────────────

export const getAuditTrail = (transactionId) =>
  api.get(`/audit/${transactionId}`).then(r => r.data);

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardSummary = () =>
  api.get('/dashboard/summary').then(r => r.data);

// ── Simulate time ─────────────────────────────────────────────────────────────

export const advanceTime = (days = 2) =>
  api.post('/simulate/advance-time', { days }).then(r => r.data);

export const resetTime = () =>
  api.post('/simulate/reset-time').then(r => r.data);

export const getSimulatedTime = () =>
  api.get('/simulate/time').then(r => r.data);

export default api;


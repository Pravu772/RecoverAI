require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const { sanitizeDatabase } = require('./src/utils/sanitizeDatabase');

// ── Route imports ─────────────────────────────────────────────────────────────
const transactionRoutes = require('./src/routes/transactions');
const recoveryRoutes = require('./src/routes/recovery');
const auditRoutes = require('./src/routes/audit');
const dashboardRoutes = require('./src/routes/dashboard');
const simulateRoutes = require('./src/routes/simulate');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB & Sanitize ─────────────────────────────────────────────
connectDB().then(() => {
  sanitizeDatabase();
});

// ── Middleware ────────────────────────────────────────────────────────────────

// CORS — allow frontend dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — production-readiness signal
// General API limiter: 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for batch operations (expensive AI calls)
const batchLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,
  message: { error: 'Batch operations are rate-limited to 10/min.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/transactions/classify-batch', batchLimiter);
app.use('/api/transactions/recover-batch', batchLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/transactions', transactionRoutes);
app.use('/api/transactions', recoveryRoutes);   // recover routes share /api/transactions prefix
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/simulate', simulateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RecoverAI Backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// express-async-errors patches async route handlers so uncaught errors reach here
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);
  console.error(err.stack);

  // Don't expose stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`RecoverAI backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

module.exports = app;

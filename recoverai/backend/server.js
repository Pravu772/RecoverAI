require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');                  // FIX #5 — HTTP security headers
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const { sanitizeDatabase } = require('./src/utils/sanitizeDatabase');

// ── FIX #1 — Startup env assertions ──────────────────────────────────────────
// Fail hard on missing critical secrets rather than using unsafe fallbacks.
const REQUIRED_ENV = ['MONGO_URI', 'INTERNAL_API_TOKEN', 'GATEWAY_WEBHOOK_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`[FATAL] Required environment variable "${key}" is not set. See .env.example.`);
  }
}

// ── Route imports ─────────────────────────────────────────────────────────────
const transactionRoutes = require('./src/routes/transactions');
const recoveryRoutes = require('./src/routes/recovery');
const auditRoutes = require('./src/routes/audit');
const dashboardRoutes = require('./src/routes/dashboard');
const simulateRoutes = require('./src/routes/simulate');
const webhookRoutes = require('./src/routes/webhooks');
const streamRoutes = require('./src/routes/stream');
const chaosRoutes = require('./src/routes/chaos');
const apiKeyRoutes = require('./src/routes/apiKeys');

// ── Enterprise Middlewares ────────────────────────────────────────────────────
const { correlation } = require('./src/middleware/correlation');
const { idempotency } = require('./src/middleware/idempotency');

const app = express();
const PORT = process.env.PORT || 5000;

const Transaction = require('./src/models/Transaction');
const { generateTransactions } = require('./src/utils/syntheticDataGenerator');

// ── Connect to MongoDB, Sanitize & Auto-Seed if empty ───────────────────────────
connectDB().then(async () => {
  sanitizeDatabase();
  try {
    const count = await Transaction.countDocuments();
    if (count === 0) {
      console.log('[AutoSeed] Database is empty. Auto-seeding 50 synthetic recovery transactions...');
      const records = generateTransactions(50);
      await Transaction.insertMany(records);
      console.log('[AutoSeed] Seeded 50 transactions successfully.');
    }
  } catch (err) {
    console.error('[AutoSeed] Error checking or seeding records:', err.message);
  }
});

// ── Middleware ────────────────────────────────────────────────────────────────

// FIX #5 — Helmet: sets X-Frame-Options, CSP, X-Content-Type-Options, HSTS, etc.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow SSE streams from same domain
}));

// Distributed tracing correlation ID
app.use(correlation);

// FIX #10 — CORS: development permits any localhost/127.0.0.1; production permits FRONTEND_ORIGIN + *.vercel.app
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no Origin header (curl, mobile, server-to-server)
    if (!origin) return cb(null, true);

    // Development: allow all localhost and 127.0.0.1 ports
    if (isDev) {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
    }

    // Production: check configured FRONTEND_ORIGIN (supports comma-separated list)
    if (process.env.FRONTEND_ORIGIN) {
      const allowedList = process.env.FRONTEND_ORIGIN.split(',').map(s => s.trim());
      if (allowedList.includes(origin) || allowedList.includes('*')) {
        return cb(null, true);
      }
    }

    // Allow any Vercel deployment URL (e.g. https://*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
      return cb(null, true);
    }

    if (isDev) return cb(null, true);
    cb(new Error(`CORS: Origin "${origin}" is not in the allowed list`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Correlation-ID', 'X-Gateway-Signature'],
  exposedHeaders: ['Idempotency-Key', 'X-Correlation-ID', 'X-Cache-Lookup'],
  credentials: true,
}));

// FIX #6 — Body size limit: prevents memory DoS via oversized JSON payloads
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cryptographic idempotency protection on all mutating routes
app.use('/api', idempotency);

// ── FIX #3 — Bearer Token Authentication ─────────────────────────────────────
// Every /api/* route requires a valid Authorization: Bearer <token> header.
// EXCEPTIONS:
//   • OPTIONS preflight requests (browsers do not attach Auth header)
//   • /api/webhooks/* — authenticated via HMAC-SHA256 signature (per gateway spec)
//   • /health          — public liveness probe for load balancers
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN;

const requireAuth = (req, res, next) => {
  // Preflight requests must pass through without auth
  if (req.method === 'OPTIONS') return next();

  // Webhooks use HMAC signature verification
  if (req.path.startsWith('/webhooks')) return next();

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token || token !== INTERNAL_API_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized. Supply a valid Bearer token via the Authorization header.',
    });
  }
  next();
};

app.use('/api', requireAuth);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General API: 120 req/min per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Batch operations (expensive AI + DB calls): 15 req/min per IP
const batchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Batch operations are rate-limited to 15/min.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/transactions/classify-batch', batchLimiter);
app.use('/api/transactions/recover-batch', batchLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/transactions', transactionRoutes);
app.use('/api/transactions', recoveryRoutes);   // recovery routes share /api/transactions prefix
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/chaos', chaosRoutes);
app.use('/api/keys', apiKeyRoutes);

// Fallback aliases for clients calling directly without /api prefix
app.use('/transactions', transactionRoutes);
app.use('/transactions', recoveryRoutes);
app.use('/audit', auditRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/simulate', simulateRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/stream', streamRoutes);
app.use('/keys', apiKeyRoutes);


// Root route — public service info
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'RecoverAI Backend API Engine',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/transactions',
      dashboard: '/api/dashboard/summary',
      stream: '/api/stream/events',
    },
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Health check — public, no auth
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RecoverAI Backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// express-async-errors patches async handlers so uncaught rejections land here
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);

  // FIX #1 — Never leak stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Start server ──────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`RecoverAI backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`[Security] helmet=ON | auth=Bearer | CORS=${isDev ? 'localhost (dev mode)' : process.env.FRONTEND_ORIGIN || 'strict'}`);
  });
}

module.exports = app;

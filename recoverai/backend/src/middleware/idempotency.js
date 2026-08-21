const crypto = require('crypto');

// In-memory idempotency store with TTL (Time-To-Live: 24 Hours)
const idempotencyStore = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

// Cleanup expired keys every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Idempotency Middleware
 * 
 * Inspects `Idempotency-Key` or `X-Idempotency-Key` headers on mutating requests (POST, PUT, PATCH).
 * - If key is currently processing: Returns 409 Conflict (Lock Active).
 * - If key has already completed: Returns exact cached status code & response payload immediately.
 * - Otherwise: Locks key, processes handler, captures response, and caches result.
 */
const idempotency = (req, res, next) => {
  // Only apply to mutating HTTP methods
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || req.body?.idempotency_key;

  // If no idempotency key was supplied by client, proceed normally
  if (!key) {
    return next();
  }

  const existing = idempotencyStore.get(key);

  if (existing) {
    if (existing.status === 'PROCESSING') {
      return res.status(409).json({
        error: 'Concurrent request in progress for this Idempotency-Key. Please retry shortly.',
        idempotency_key: key,
      });
    }

    // Return cached response with custom idempotency header
    res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_HIT');
    res.setHeader('Idempotency-Key', key);
    return res.status(existing.statusCode).json(existing.body);
  }

  // Acquire lock
  idempotencyStore.set(key, {
    status: 'PROCESSING',
    timestamp: Date.now(),
    method: req.method,
    url: req.originalUrl,
  });

  // Intercept res.json to capture response payload
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Release lock & store cached result
    idempotencyStore.set(key, {
      status: 'COMPLETED',
      timestamp: Date.now(),
      statusCode: res.statusCode,
      body,
    });

    res.setHeader('X-Cache-Lookup', 'IDEMPOTENT_SAVED');
    res.setHeader('Idempotency-Key', key);
    return originalJson(body);
  };

  next();
};

module.exports = { idempotency, idempotencyStore };

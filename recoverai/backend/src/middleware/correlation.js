const { v4: uuidv4 } = require('uuid');

/**
 * Correlation ID Middleware
 * 
 * Attaches a unique `X-Correlation-ID` to every HTTP request, allowing end-to-end
 * distributed tracing across database writes, Gemini API calls, and audit logs.
 */
const correlation = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || `CORR_${uuidv4().substring(0, 8).toUpperCase()}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        level: res.statusCode >= 400 ? 'WARN' : 'INFO',
        timestamp: new Date().toISOString(),
        correlation_id: correlationId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration_ms: durationMs,
      }));
    }
  });

  next();
};

module.exports = { correlation };

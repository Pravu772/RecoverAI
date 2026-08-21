/**
 * Circuit Breaker for External AI Services (Gemini API)
 * 
 * Prevents cascading timeouts when upstream AI APIs experience outages or rate limits.
 * States:
 *   - CLOSED: Normal operation, all calls pass through.
 *   - OPEN: Upstream failing, fast-fails immediately to rule-based fallback (0ms latency).
 *   - HALF_OPEN: Trial period to test if upstream has recovered.
 */

class CircuitBreaker {
  constructor(failureThreshold = 3, resetTimeoutMs = 30000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.lastStateChange = Date.now();
  }

  async execute(asyncFn, fallbackFn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.lastStateChange = Date.now();
        console.log('[CircuitBreaker] Transitioned to HALF_OPEN — probing upstream health');
      } else {
        // Fast-fail to fallback
        return fallbackFn(new Error('[CircuitBreaker] Breaker is OPEN — fast-path fallback active'));
      }
    }

    try {
      const result = await asyncFn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastStateChange = Date.now();
        console.log('[CircuitBreaker] Upstream recovered. Transitioned to CLOSED');
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
        this.lastStateChange = Date.now();
        console.warn(`[CircuitBreaker] Threshold reached (${this.failureCount} errors). Breaker tripped OPEN.`);
      }

      return fallbackFn(err);
    }
  }

  getStatus() {
    return {
      state: this.state,
      failure_count: this.failureCount,
      failure_threshold: this.failureThreshold,
      last_failure_time: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }
}

const geminiCircuitBreaker = new CircuitBreaker(3, 30000);

module.exports = { geminiCircuitBreaker, CircuitBreaker };

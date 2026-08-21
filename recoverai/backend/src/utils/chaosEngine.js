const { sseBroadcaster } = require('./sseBroadcaster');
const { geminiCircuitBreaker } = require('./circuitBreaker');

/**
 * Chaos Engineering & Payment Gateway Degradation Injector
 * 
 * Simulates real-world bank gateway outages, 504 timeouts, and network degradation
 * to prove that RecoverAI's circuit breakers, semantic prompt caches, and rule-based
 * fast paths keep the system 100% operational.
 */

class ChaosEngine {
  constructor() {
    this.isActive = false;
    this.degradationMode = 'NONE'; // 'NONE' | 'BANK_TIMEOUT_BURST' | 'AI_OUTAGE' | 'NETWORK_LATENCY'
    this.injectedEventsCount = 0;
  }

  setMode(mode) {
    this.degradationMode = mode;
    this.isActive = mode !== 'NONE';
    
    sseBroadcaster.broadcast('chaos_state_changed', {
      is_active: this.isActive,
      mode: this.degradationMode,
      timestamp: new Date().toISOString(),
      message: this.isActive ? `Chaos Mode Enabled: ${mode}` : 'Chaos Mode Disabled — Normal Gateway Health Restored',
    });

    console.log(`[ChaosEngine] Mode set to: ${mode}`);
    return this.getStatus();
  }

  getStatus() {
    return {
      is_active: this.isActive,
      mode: this.degradationMode,
      injected_events_count: this.injectedEventsCount,
      circuit_breaker: geminiCircuitBreaker.getStatus(),
    };
  }

  shouldSimulateTimeout() {
    if (!this.isActive) return false;
    if (this.degradationMode === 'BANK_TIMEOUT_BURST') {
      this.injectedEventsCount++;
      return Math.random() < 0.75;
    }
    return false;
  }

  shouldSimulateAIOutage() {
    if (!this.isActive) return false;
    if (this.degradationMode === 'AI_OUTAGE') {
      this.injectedEventsCount++;
      return true;
    }
    return false;
  }
}

const chaosEngine = new ChaosEngine();

module.exports = { chaosEngine };

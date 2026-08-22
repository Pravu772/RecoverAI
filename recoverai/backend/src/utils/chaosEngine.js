const { sseBroadcaster } = require('./sseBroadcaster');
const { geminiCircuitBreaker } = require('./circuitBreaker');

/**
 * Chaos Engineering & System Resilience Injector
 * 
 * Simulates real-world bank gateway outages, upstream AI API downtime, and invalid payloads
 * to demonstrate that RecoverAI's circuit breakers, semantic prompt caches, and rule-based
 * fallbacks maintain pipeline continuity gracefully.
 */

class ChaosEngine {
  constructor() {
    this.isActive = false;
    this.degradationMode = 'NONE'; // 'NONE' | 'BANK_TIMEOUT_BURST' | 'AI_OUTAGE' | 'NETWORK_LATENCY'
    this.armedFailure = null; // 'gemini_api_down' | 'database_timeout' | 'invalid_transaction_data'
    this.injectedEventsCount = 0;
  }

  armNextFailure(failureType) {
    this.armedFailure = failureType;
    this.isActive = true;
    this.injectedEventsCount++;

    sseBroadcaster.broadcast('chaos_state_changed', {
      is_active: true,
      mode: this.degradationMode,
      armed_failure: failureType,
      timestamp: new Date().toISOString(),
      message: `Controlled Chaos Armed: ${failureType} — watch the system self-heal`,
    });

    return this.getStatus();
  }

  consumeArmedFailure(failureType) {
    if (this.armedFailure === failureType) {
      this.armedFailure = null;
      if (this.degradationMode === 'NONE') {
        this.isActive = false;
      }
      return true;
    }
    return false;
  }

  setMode(mode) {
    this.degradationMode = mode;
    this.isActive = mode !== 'NONE' || this.armedFailure !== null;
    
    sseBroadcaster.broadcast('chaos_state_changed', {
      is_active: this.isActive,
      mode: this.degradationMode,
      armed_failure: this.armedFailure,
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
      armed_failure: this.armedFailure,
      injected_events_count: this.injectedEventsCount,
      circuit_breaker: geminiCircuitBreaker.getStatus(),
    };
  }

  shouldSimulateTimeout() {
    if (this.consumeArmedFailure('database_timeout')) return true;
    if (!this.isActive) return false;
    if (this.degradationMode === 'BANK_TIMEOUT_BURST') {
      this.injectedEventsCount++;
      return Math.random() < 0.75;
    }
    return false;
  }

  shouldSimulateAIOutage() {
    if (this.consumeArmedFailure('gemini_api_down')) return true;
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


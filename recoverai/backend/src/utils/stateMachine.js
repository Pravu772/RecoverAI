/**
 * Deterministic Finite State Machine (FSM) for Autonomous Revenue Recovery
 * 
 * Formal state transitions:
 *  - failed -> [classifying, pending_human, opted_out]
 *  - classifying -> [action_taken, exception, pending_human, max_retries_reached]
 *  - action_taken -> [recovered, action_taken, max_retries_reached, ptp_committed, ptp_broken, pending_human, opted_out]
 *  - ptp_committed -> [recovered, ptp_broken, pending_human]
 *  - ptp_broken -> [action_taken, pending_human, max_retries_reached]
 *  - exception -> [classifying, action_taken, pending_human, recovered]
 *  - pending_human -> [action_taken, recovered, max_retries_reached, opted_out]
 *  - max_retries_reached -> [pending_human] (Permanent automated stop; human override only)
 *  - opted_out -> [] (Terminal state)
 *  - recovered -> [] (Terminal state)
 */


const ALLOWED_TRANSITIONS = {
  failed: ['classifying', 'action_taken', 'pending_human', 'opted_out', 'exception', 'recovered'],
  classifying: ['action_taken', 'exception', 'pending_human', 'max_retries_reached', 'recovered'],
  action_taken: ['recovered', 'action_taken', 'max_retries_reached', 'ptp_committed', 'ptp_broken', 'pending_human', 'opted_out', 'exception'],
  ptp_committed: ['recovered', 'ptp_broken', 'pending_human', 'action_taken'],
  ptp_broken: ['action_taken', 'pending_human', 'max_retries_reached', 'recovered'],
  exception: ['classifying', 'action_taken', 'pending_human', 'recovered', 'max_retries_reached'],
  pending_human: ['action_taken', 'recovered', 'max_retries_reached', 'opted_out', 'ptp_committed'],
  max_retries_reached: ['pending_human'],
  opted_out: [],
  recovered: [],
};

class InvalidStateTransitionError extends Error {
  constructor(fromState, toState, transactionId) {
    super(`[FSM Guard] Illegal transition attempted from "${fromState}" to "${toState}" for transaction ${transactionId || 'UNKNOWN'}.`);
    this.name = 'InvalidStateTransitionError';
    this.statusCode = 422;
    this.fromState = fromState;
    this.toState = toState;
  }
}

/**
 * Validates whether transitioning `fromState` to `toState` is legally permitted.
 * @throws {InvalidStateTransitionError} if the transition is prohibited.
 */
const validateTransition = (fromState, toState, transactionId) => {
  if (fromState === toState) {
    return true; // No-op transition allowed
  }

  const allowed = ALLOWED_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new InvalidStateTransitionError(fromState, toState, transactionId);
  }

  return true;
};

module.exports = {
  validateTransition,
  InvalidStateTransitionError,
  ALLOWED_TRANSITIONS,
};

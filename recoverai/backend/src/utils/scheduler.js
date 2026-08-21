/**
 * Simulated Time Scheduler
 *
 * RecoverAI uses a simulated clock so cooldown enforcement (e.g., "scheduled_retry_2days")
 * can be demonstrated without literally waiting 2 days.
 *
 * The `TIME_OFFSET_MS` variable stores an offset added to real wall-clock time.
 * Calling advanceTime(2) fast-forwards the simulation by 2 days instantly.
 *
 * All cooldown comparisons in recoveryService use getSimulatedNow() instead of new Date().
 */

// Global time offset in milliseconds (0 = real time)
let TIME_OFFSET_MS = 0;

/**
 * Returns the current simulated time (wall clock + offset).
 * @returns {Date}
 */
const getSimulatedNow = () => new Date(Date.now() + TIME_OFFSET_MS);

/**
 * Advances the simulated clock by `days` days.
 * @param {number} days - Number of days to advance (can be fractional)
 */
const advanceTime = (days) => {
  TIME_OFFSET_MS += days * 24 * 60 * 60 * 1000;
  console.log(`[Scheduler] Simulated time advanced by ${days} day(s). Offset: ${TIME_OFFSET_MS / 3600000}h`);
};

/**
 * Resets the simulated clock back to real wall time.
 */
const resetTime = () => {
  TIME_OFFSET_MS = 0;
  console.log('Simulated time reset to real time');
};

/**
 * Returns the current time offset in hours (for display purposes).
 * @returns {number}
 */
const getOffsetHours = () => TIME_OFFSET_MS / 3600000;

module.exports = { getSimulatedNow, advanceTime, resetTime, getOffsetHours };

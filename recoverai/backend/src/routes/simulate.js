const express = require('express');
const router = express.Router();
const { advanceTime, resetTime, getOffsetHours, getSimulatedNow } = require('../utils/scheduler');

/**
 * POST /api/simulate/advance-time
 * Fast-forwards the simulated clock for demo purposes.
 * Body: { days: number }
 *
 * This allows scheduled_retry_2days cooldowns to be demonstrated without
 * literally waiting 2 days. Call this endpoint to skip forward.
 */
router.post('/advance-time', (req, res) => {
  const days = parseFloat(req.body.days || 2);

  if (isNaN(days) || days <= 0 || days > 365) {
    return res.status(400).json({ error: 'days must be a positive number <= 365' });
  }

  advanceTime(days);

  res.json({
    message: `Simulated time advanced by ${days} day(s)`,
    current_simulated_time: getSimulatedNow().toISOString(),
    total_offset_hours: getOffsetHours(),
  });
});

/**
 * POST /api/simulate/reset-time
 * Resets simulated clock back to real wall time.
 */
router.post('/reset-time', (req, res) => {
  resetTime();
  res.json({
    message: 'Simulated time reset to real time',
    current_simulated_time: getSimulatedNow().toISOString(),
    total_offset_hours: 0,
  });
});

/**
 * GET /api/simulate/time
 * Returns current simulated time and offset.
 */
router.get('/time', (req, res) => {
  res.json({
    current_simulated_time: getSimulatedNow().toISOString(),
    total_offset_hours: getOffsetHours(),
    real_time: new Date().toISOString(),
  });
});

module.exports = router;

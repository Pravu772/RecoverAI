const express = require('express');
const router = express.Router();
const { chaosEngine } = require('../utils/chaosEngine');

/**
 * GET /api/chaos/status
 */
router.get('/status', (req, res) => {
  res.json(chaosEngine.getStatus());
});

/**
 * POST /api/chaos/set-mode
 * Body: { mode: 'NONE' | 'BANK_TIMEOUT_BURST' | 'AI_OUTAGE' }
 */
router.post('/set-mode', (req, res) => {
  const { mode } = req.body;
  const status = chaosEngine.setMode(mode || 'NONE');
  res.json({ message: `Chaos mode updated to ${mode}`, status });
});

module.exports = router;

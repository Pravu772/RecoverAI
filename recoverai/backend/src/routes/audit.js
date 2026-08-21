const express = require('express');
const router = express.Router();
const { getAuditTrail } = require('../controllers/dashboardController');
const auditService = require('../services/auditService');

// Verify cryptographic hash chain integrity
router.get('/:transaction_id/verify-chain', async (req, res) => {
  const result = await auditService.verifyChain(req.params.transaction_id);
  res.json(result);
});

// Full audit trail for a specific transaction
router.get('/:transaction_id', getAuditTrail);

module.exports = router;

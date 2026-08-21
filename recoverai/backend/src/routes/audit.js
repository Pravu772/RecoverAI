const express = require('express');
const router = express.Router();
const { getAuditTrail } = require('../controllers/dashboardController');

// Full audit trail for a specific transaction
router.get('/:transaction_id', getAuditTrail);

module.exports = router;

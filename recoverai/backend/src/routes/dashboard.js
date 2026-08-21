const express = require('express');
const router = express.Router();
const { getSummary, getAuditTrail } = require('../controllers/dashboardController');

// Dashboard summary metrics
router.get('/summary', getSummary);

// Full audit trail for a transaction (accessible from dashboard controller)
router.get('/audit/:transaction_id', getAuditTrail);

module.exports = router;

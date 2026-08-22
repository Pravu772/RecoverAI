const express = require('express');
const router = express.Router();
const { getSummary, getAuditTrail } = require('../controllers/dashboardController');
const { getBatchReport } = require('../controllers/batchReportController');

// Dashboard summary metrics
router.get('/summary', getSummary);

// Batch test results module (Priority 1)
router.get('/batch-report', getBatchReport);

// Full audit trail for a transaction (accessible from dashboard controller)
router.get('/audit/:transaction_id', getAuditTrail);

module.exports = router;


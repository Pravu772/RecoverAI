const express = require('express');
const router = express.Router();
const {
  generateBatch,
  classifyOne,
  classifyBatch,
  getOrGenerateVoiceScript,
  setPromiseToPay,
  updatePTPStatus,
  listTransactions,
  injectSingleTransaction,
} = require('../controllers/transactionController');

// Generate synthetic batch
router.post('/generate', generateBatch);

// Inject single custom failure
router.post('/inject-single', injectSingleTransaction);

// Classify batch (all failed)
router.post('/classify-batch', classifyBatch);

// Classify single transaction
router.post('/:id/classify', classifyOne);

// Voice AI Script generation & retrieval
router.post('/:id/voice-script', getOrGenerateVoiceScript);

// Promise-to-Pay (PTP) registration & update
router.post('/:id/ptp', setPromiseToPay);
router.post('/:id/ptp-status', updatePTPStatus);

// List all transactions (with optional filters)
router.get('/', listTransactions);

module.exports = router;

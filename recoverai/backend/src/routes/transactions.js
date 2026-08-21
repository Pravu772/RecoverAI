const express = require('express');
const router = express.Router();
const { generateBatch, classifyOne, classifyBatch, listTransactions } = require('../controllers/transactionController');

// Generate synthetic batch
router.post('/generate', generateBatch);

// Classify batch (all failed)
router.post('/classify-batch', classifyBatch);

// Classify single transaction
router.post('/:id/classify', classifyOne);

// List all transactions (with optional filters)
router.get('/', listTransactions);

module.exports = router;

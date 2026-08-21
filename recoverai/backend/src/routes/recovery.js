const express = require('express');
const router = express.Router();
const { recoverOne, recoverBatch } = require('../controllers/recoveryController');

// Run recovery for all classified transactions
router.post('/recover-batch', recoverBatch);

// Run recovery for a single transaction
router.post('/:id/recover', recoverOne);

module.exports = router;

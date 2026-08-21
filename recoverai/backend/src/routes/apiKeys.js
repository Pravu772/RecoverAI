const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-memory demo API keys store (can be persisted to MongoDB)
let apiKeysStore = [
  {
    id: 'key_1',
    name: 'Production Ingestion Key',
    prefix: 'rk_live_98a72b',
    scopes: ['transactions:write', 'recovery:execute', 'audit:read'],
    created_at: new Date('2026-01-15').toISOString(),
    status: 'ACTIVE',
  },
  {
    id: 'key_2',
    name: 'Auditor Read-Only Key',
    prefix: 'rk_test_54c90e',
    scopes: ['audit:read', 'compliance:verify'],
    created_at: new Date('2026-02-01').toISOString(),
    status: 'ACTIVE',
  },
];

/**
 * GET /api/keys
 * List active merchant API keys
 */
router.get('/', (req, res) => {
  res.json({ keys: apiKeysStore });
});

/**
 * POST /api/keys/generate
 * Generates a new cryptographically secure scoped API key
 */
router.post('/generate', (req, res) => {
  const { name, scopes, environment } = req.body;
  const rawSecret = crypto.randomBytes(24).toString('hex');
  const prefix = environment === 'production' ? `rk_live_${rawSecret.substring(0, 8)}` : `rk_test_${rawSecret.substring(0, 8)}`;
  const fullKey = `${prefix}_${rawSecret}`;

  const newRecord = {
    id: `key_${Date.now()}`,
    name: name || 'Custom Service Key',
    prefix,
    scopes: scopes || ['transactions:write', 'recovery:execute', 'audit:read'],
    created_at: new Date().toISOString(),
    status: 'ACTIVE',
  };

  apiKeysStore.push(newRecord);

  res.status(201).json({
    message: 'New scoped API key created. Store secret key securely — it will not be shown again.',
    apiKey: fullKey,
    keyRecord: newRecord,
  });
});

/**
 * DELETE /api/keys/:id
 * Revoke an API key
 */
router.delete('/:id', (req, res) => {
  apiKeysStore = apiKeysStore.filter(k => k.id !== req.params.id);
  res.json({ message: `API Key ${req.params.id} revoked successfully.` });
});

module.exports = router;

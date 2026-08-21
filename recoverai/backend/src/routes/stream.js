const express = require('express');
const router = express.Router();
const { sseBroadcaster } = require('../utils/sseBroadcaster');

/**
 * GET /api/stream/events
 * Persistent Server-Sent Events (SSE) stream for real-time dashboard terminal
 */
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'STREAM_CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  sseBroadcaster.addClient(res);
});

module.exports = router;
